
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

function createDomNode(fiber){ //this just converts your library's createElement to actual html element
    const domNode = fiber.type === "TEXT_ELEMENT" ? 
      document.createTextNode("")
    : document.createElement(fiber.type)


    Object.keys(fiber.props)
        .filter((key) => key != "children")
        .map((key)=>{
            domNode[key] = fiber.props[key]
        })

    return domNode
}

let nextUnitOfWork = null
let wipRoot = null
let deletions = null
let currentRoot = null

requestIdleCallback(workLoop)

function render(element, container) {
    wipRoot = { //this is the structure of a fiber. container an element here should be instances of our createElement 
      dom: container, //container is alread an html element thus we dont need to do createDom to create the node, thus we just use plain container instead of createDom(container)
      props: {
        children: [element],
      },
      alternate: currentRoot
    }
    deletions = []
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
    commitRoot() 
  }
  requestIdleCallback(workLoop)
}

function commitRoot() {
    deletions.forEach(commitWork) //send all the nodes we have gathered to be delete from the dom by commiWork
    commitWork(wipRoot.child)
    currentRoot = wipRoot
    wipRoot = null
}

 
function commitWork(fiber) {//recuresively add nodes to the dom
    if (!fiber) {
        return
    }

    let domParentFiber = fiber.parent
    while(!(domParentFiber.dom)){ //as we know functional components donot have parents, so we need to keep going up the parents to find a fiber which has a dom
        domParentFiber = domParentFiber.parent
    }
    const domParent = domParentFiber.dom
    if(fiber.effectTag == "PLACEMENT" && fiber.dom != null){
        domParent.appendChild(fiber.dom)
    } else if (
        fiber.effectTag === "UPDATE" &&
        fiber.dom != null
      ) {
        updateDom(
          fiber.dom,
          fiber.alternate.props,
          fiber.props
        )
    }
    else if(fiber.effectTab == "DELETION"){
        commitDeletion(fiber.dom)
    }
    commitWork(fiber.child)
    commitWork(fiber.sibling)
}

function commitDeletion(fiber,domParent ){
    if(fiber.dom){
        domParent.removeChild(fiber.dom)
    }else{
        commitDeletion(fiber.child, domParent)
    }
}

const isPropAProperty = (prop) => prop != "children"  && !isEvent(key)
function isPropertyGone(nextProps){
    return function(key){
        if(!(key in nextProps))
            return true
        else return false
    }
}
function isPropertyChanged(prevProps, nextProps){
    return function(key){
       return prevProps[key] != nextProps[key]
    }
}

function isEvent (key) {
    return key.startsWith('on')
}
function updateDom(dom, prevProps, nextProps){
    //remove all events which are either deleted or changed
    Object.keys(prevProps)
    .filter(isEvent)
    .filter(key=> !(key in nextProps) || isPropertyChanged(prevProps, nextProps)(key))
    .forEach(prop => {
        const eventName = prop.toLowerCase().substring(2)
        dom.removeEventListener(
            eventName, 
            prevProps[prop]
        )
    })
    
    //remove the deleted props
    Object.keys(prevProps)
        .filter(isPropAProperty)
        .filter(isPropertyGone(nextProps))
        .forEach((prop) => {
            dom[prop] = ""
        })

    //set new or changed props
    Object.keys(prevProps)
    .filter(isPropAProperty)
    .filter(isPropertyChanged(prevProps, nextProps))
    .forEach(prop => {
        dom[prop] = nextProps[prop]
    })

    //add new events
    Object.keys(prevProps)
    .filter(isEvent)
    .filter(isPropertyChanged(prevProps, nextProps))
    .forEach(prop => {
        const eventName = prop.toLowerCase().substring(2)
        dom.addEventListener(
            eventName, 
            nextProps[prop]
        )
    })
    
}

function reconcileChildren(wipFiber, elements)
{
    let index = 0
    let oldFiber = wipFiber.alternate && wipFiber.alternate.child
    let prevSibling = null

    while(index<elements.length || oldFiber !=null){
        let element = elements[index]
        let newFiber = null
        //now we compare the old and the current fiber
        const sameType = oldFiber && element && oldFiber.type == element.type

        if(sameType){
            //just update the props of the old fiber node
            newFiber = {
                type: oldFiber.type,
                props: element.props,
                dom: oldFiber.dom,
                parent: wipFiber,
                alternate: oldFiber,
                effectTag: "UPDATE"
            }
        }
        if(element && !sameType){
            //need to create and add a new node
            newFiber = {
                type: element.type,
                props: element.props,
                dom: null,
                parent: wipFiber,
                alternate: null,
                effectTag: "PLACEMENT"
            }
        }
        if(oldFiber && !sameType){
            //need to delete the oldFiber node
            oldFiber.effectTag = "DELETION"
            deletions.push(oldFiber)
        }
        
        //why tf ?
        if (oldFiber) {
            oldFiber = oldFiber.sibling
        }

        if(index == 0){
            wipFiber.child = newFiber
        }else {
            prevSibling.sibling = newFiber
        }
        prevSibling = newFiber
        index++
    }
}

let wipFiber = null
let hookIndex = null

function updateFunctionComponent(fiber){
    wipFiber = fiber
    hookIndex = 0
    wipFiber.hooks = []
    const children = [fiber.type(fiber.props)] //run the function to get children, in this case it returns the h1 element and then we reconcile as usual
    reconcileChildren(fiber, children)
}

function updateHostComponent(fiber){
    if(!fiber.dom){
        fiber.dom = createDomNode(fiber)
    }
 
    let elements = fiber.props.children

    reconcileChildren(fiber, elements)
}

function performUnitOfWork(fiber) {
    //we have to attach a fiber to the dom 

    const isFunctionComponent = fiber.type instanceof Function

    //we handle functional components differently than normal jsx or host fibers as in functional components as in this case the children can be received only after running the function
    if(isFunctionComponent){
        updateFunctionComponent(fiber)
    } else {
        updateHostComponent(fiber)
    }

    // let index = 0
    // let prevSibling = null
    //create fibers for eachof teh children
    
    // while(index < elements.length){
    //     let element = elements[index]

    //     let newFiber = {
    //         dom: null,
    //         type: element.type,
    //         props: element.props, //this has the childre btw
    //         parent: fiber,
    //         sibling: null,
    //     }

    //     if(index == 0){
    //         fiber.child = newFiber
    //     }else {
    //         prevSibling.sibling = newFiber
    //     }
    //     prevSibling = newFiber
    //     index++
    // }

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

function useState(initial) {
    const oldHook =
      wipFiber.alternate &&
      wipFiber.alternate.hooks &&
      wipFiber.alternate.hooks[hookIndex]
    const hook = {
      state: oldHook ? oldHook.state : initial,
      queue: [], //why
    }

    const actions = oldHook ? oldHook.queue : []
    actions.forEach(action => {
      hook.state = action(hook.state)
    })
    
    const setState = action => {
        hook.queue.push(action)
        wipRoot = {
          dom: currentRoot.dom,
          props: currentRoot.props,
          alternate: currentRoot,
        }
        nextUnitOfWork = wipRoot
        deletions = []
      }

      wipFiber.hooks.push(hook)
    hookIndex++
    return [hook.state, setState]
  }

const CustomReact = {
    createElement,
    render,
    useState,
}
function App(props) {
    const [state, setState] = CustomReact.useState(1)
    return <h1 onClick={() =>null}>Hi {props.name}</h1>
  }
const element = <App name="foo"/>
  
const container = document.getElementById("root")
CustomReact.render(element, container)
