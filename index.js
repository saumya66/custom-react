
function createElement(type, props, ...children) { //this automatically gets triggered when jsx is converted to js by babel when building
    return {
        type,
        props: {
            ...props, //props are spreaded
            children: children.map((child) => {
                if (typeof child === "object")
                    return child
                else {
                    return createTextElement(child)
                }
            })
        }
    }
}

function createTextElement(text){
    return {
        type: "TEXT_ELEMENT",
        props:{
            nodeValue: text,
            children: []
        }
    }
}

function createDom(fiber){ //this just converts your library's createElement to actual html element
    const dom = fiber.type === "TEXT_ELEMENT" ? 
      document.createTextNode("")
    : document.createElement(fiber.type)


    Object.keys(fiber.props)
        .filter((key) => key != "children")
        .map((key)=>{
            currentNode[key] = fiber.props[key]
        })

    return dom
}

let nextUnitOfWork = null
let wipRoot = null
requestIdleCallback(workLoop)

function render(element, container) {
    wipRoot = { //this is the structure of a fiber. container an element here should be instances of our createElement 
      dom: container, //container is alread an html element thus we dont need to do createDom to create the node, thus we just use plain container instead of createDom(container)
      props: {
        children: [element],
      },
    }
    nextUnitOfWork = wipRoot
  }

function workLoop(deadline) {
  let shouldYield = false
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(
      nextUnitOfWork
    )
    shouldYield = deadline.timeRemaining() < 1
  }
  if(!nextUnitOfWork && wipRoot){ //all work is done, then only we commit to root or manipulate the dom, as we dont want users to see incomplete ui which would be the case if we keep manipulating dom as we go through this process and brower interrupt us
    commitRoot(wipRoot.child) 
  }
  requestIdleCallback(workLoop)
}

function commitRoot(fiber){//recuresively add nodes to the dom
    if(!fiber){
        return
    }

    let parentDome = fiber.parent.dom 
    parentDome.appendChild(fiber.dom)
    commitRoot(fiber.child)
    commitRoot(fiber.sibling)
}

function performUnitOfWork(fiber) {
    //above we have attached a fiber to the dom 
    if(!fiber.dom){
        fiber.dom = createDom(fiber)
    }

    

    //now we create new fibers from all children of current fiber
    let elements = fiber.props.children
    let index = 0
    let prevSibling = null
    //create fibers for eachof teh children
    
    while(index < elements.length){
        let element = elements[index]

        newFiber = {
            dom: null,
            type: element.type,
            props: element.props, //this has the childre btw
            parent: fiber,
            sibling: null,
        }

        if(index == 0){
            fiber.child = newFiber
        }else {
            prevSibling.sibling = newFiber
        }
        prevSibling = newFiber
        ++index
    }

    //now we will assign the next nextUnitOfWork
    if(fiber.child){
        return fiber.child
    }
    else {
        let nextFiber = fiber
        while(nextFiber){
            if(nextFiber.sibling){
                return nextFiber.sibling
            } 
            nextFiber  = nextFiber.parent
        }
    }


}


const CustomReact = {
    createElement,
    render
}

const element = <h1>ok what is upppp</h1>
const container = document.getElementById("root")
console.log(container)
CustomReact.render(element, container)
