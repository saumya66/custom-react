"use strict";

function _typeof(o) { "@babel/helpers - typeof"; return _typeof = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function (o) { return typeof o; } : function (o) { return o && "function" == typeof Symbol && o.constructor === Symbol && o !== Symbol.prototype ? "symbol" : typeof o; }, _typeof(o); }
function ownKeys(e, r) { var t = Object.keys(e); if (Object.getOwnPropertySymbols) { var o = Object.getOwnPropertySymbols(e); r && (o = o.filter(function (r) { return Object.getOwnPropertyDescriptor(e, r).enumerable; })), t.push.apply(t, o); } return t; }
function _objectSpread(e) { for (var r = 1; r < arguments.length; r++) { var t = null != arguments[r] ? arguments[r] : {}; r % 2 ? ownKeys(Object(t), !0).forEach(function (r) { _defineProperty(e, r, t[r]); }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(t)) : ownKeys(Object(t)).forEach(function (r) { Object.defineProperty(e, r, Object.getOwnPropertyDescriptor(t, r)); }); } return e; }
function _defineProperty(e, r, t) { return (r = _toPropertyKey(r)) in e ? Object.defineProperty(e, r, { value: t, enumerable: !0, configurable: !0, writable: !0 }) : e[r] = t, e; }
function _toPropertyKey(t) { var i = _toPrimitive(t, "string"); return "symbol" == _typeof(i) ? i : i + ""; }
function _toPrimitive(t, r) { if ("object" != _typeof(t) || !t) return t; var e = t[Symbol.toPrimitive]; if (void 0 !== e) { var i = e.call(t, r || "default"); if ("object" != _typeof(i)) return i; throw new TypeError("@@toPrimitive must return a primitive value."); } return ("string" === r ? String : Number)(t); }
function createElement(type, props) {
  for (var _len = arguments.length, children = new Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    children[_key - 2] = arguments[_key];
  }
  //this automatically gets triggered when jsx is converted to js by babel when building
  return {
    type: type,
    props: _objectSpread(_objectSpread({}, props), {}, {
      //props are spreaded
      children: children.map(function (child) {
        if (_typeof(child) === "object") return child;else {
          return createTextElement(child);
        }
      })
    })
  };
}
function createTextElement(text) {
  return {
    type: "TEXT_ELEMENT",
    props: {
      nodeValue: text,
      children: []
    }
  };
}
function createDomNode(fiber) {
  //this just converts your library's createElement to actual html element
  var domNode = fiber.type === "TEXT_ELEMENT" ? document.createTextNode("") : document.createElement(fiber.type);
  Object.keys(fiber.props).filter(function (key) {
    return key != "children";
  }).map(function (key) {
    domNode[key] = fiber.props[key];
  });
  return domNode;
}
var nextUnitOfWork = null;
var wipRoot = null;
var deletions = null;
var currentRoot = null;
requestIdleCallback(workLoop);
function render(element, container) {
  wipRoot = {
    //this is the structure of a fiber. container an element here should be instances of our createElement 
    dom: container,
    //container is alread an html element thus we dont need to do createDom to create the node, thus we just use plain container instead of createDom(container)
    props: {
      children: [element]
    },
    alternate: currentRoot
  };
  deletions = [];
  nextUnitOfWork = wipRoot;
}
function workLoop(deadline) {
  var shouldYield = false;
  while (nextUnitOfWork && !shouldYield) {
    nextUnitOfWork = performUnitOfWork(nextUnitOfWork);
    shouldYield = deadline.timeRemaining() < 1;
  }
  if (!nextUnitOfWork && wipRoot) {
    //all work is done, then only we commit to root or manipulate the dom, as we dont want users to see incomplete ui which would be the case if we keep manipulating dom as we go through this process and brower interrupt us
    commitRoot();
  }
  requestIdleCallback(workLoop);
}
function commitRoot() {
  deletions.forEach(commitWork); //send all the nodes we have gathered to be delete from the dom by commiWork
  commitWork(wipRoot.child);
  currentRoot = wipRoot;
  wipRoot = null;
}
function commitWork(fiber) {
  //recuresively add nodes to the dom
  if (!fiber) {
    return;
  }
  var domParent = fiber.parent.dom;
  if (fiber.effectTag == "PLACEMENT" && fiber.dom != null) {
    domParent.appendChild(fiber.dom);
  } else if (fiber.effectTag === "UPDATE" && fiber.dom != null) {
    updateDom(fiber.dom, fiber.alternate.props, fiber.props);
  } else if (fiber.effectTab == "DELETION") {
    domParent.removeChild(fiber.dom);
  }
  commitWork(fiber.child);
  commitWork(fiber.sibling);
}
var isPropAProperty = function isPropAProperty(prop) {
  return prop != "children" && !isEvent(key);
};
function isPropertyGone(nextProps) {
  return function (key) {
    if (!(key in nextProps)) return true;else return false;
  };
}
function isPropertyChanged(prevProps, nextProps) {
  return function (key) {
    return prevProps[key] != nextProps[key];
  };
}
function isEvent(key) {
  return key.startsWith('on');
}
function updateDom(dom, prevProps, nextProps) {
  //remove all events which are either deleted or changed
  Object.keys(prevProps).filter(isEvent).filter(function (key) {
    return !(key in nextProps) || isPropertyChanged(prevProps, nextProps)(key);
  }).forEach(function (prop) {
    var eventName = prop.toLowerCase().substring(2);
    dom.removeEventListener(eventName, prevProps[prop]);
  });

  //remove the deleted props
  Object.keys(prevProps).filter(isPropAProperty).filter(isPropertyGone(nextProps)).forEach(function (prop) {
    dom[prop] = "";
  });

  //set new or changed props
  Object.keys(prevProps).filter(isPropAProperty).filter(isPropertyChanged(prevProps, nextProps)).forEach(function (prop) {
    dom[prop] = nextProps[prop];
  });

  //add new events
  Object.keys(prevProps).filter(isEvent).filter(isPropertyChanged(prevProps, nextProps)).forEach(function (prop) {
    var eventName = prop.toLowerCase().substring(2);
    dom.addEventListener(eventName, nextProps[prop]);
  });
}
function reconcileChildren(wipFiber, elements) {
  var index = 0;
  var oldFiber = wipFiber.alternate && wipFiber.alternate.child;
  while (index < elements.length || oldFiber != null) {
    var _element = elements[index];
    var newFiber = null;
    var prevSibling = null;
    //now we compare the old and the current fiber
    var sameType = oldFiber && _element && oldFiber.type == _element.type;
    if (sameType) {
      //just update the props of the old fiber node
      newFiber = {
        type: oldFiber.type,
        props: _element.props,
        dom: oldFiber.dom,
        parent: wipFiber,
        alternate: oldFiber,
        effectTag: "UPDATE"
      };
    }
    if (_element && !sameType) {
      //need to create and add a new node
      newFiber = {
        type: _element.type,
        props: _element.props,
        dom: null,
        parent: wipFiber,
        alternate: null,
        effectTag: "PLACEMENT"
      };
    }
    if (oldFiber && !sameType) {
      //need to delete the oldFiber node
      oldFiber.effectTag = "DELETION";
      deletions.push(oldFiber);
    }

    //why tf ?
    if (oldFiber) {
      oldFiber = oldFiber.sibling;
    }
    if (index == 0) {
      wipFiber.child = newFiber;
    } else {
      prevSibling.sibling = newFiber;
    }
    prevSibling = newFiber;
    index++;
  }
}
function performUnitOfWork(fiber) {
  //we have to attach a fiber to the dom 
  if (!fiber.dom) {
    fiber.dom = createDomNode(fiber);
  }

  // if (fiber.parent) { //this is bad 
  //     fiber.parent.dom.appendChild(fiber.dom)
  // }

  //now we create new fibers from all children of current fiber
  var elements = fiber.props.children;
  reconcileChildren(fiber, elements);

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
  if (fiber.child) {
    return fiber.child;
  } else {
    var nextFiber = fiber;
    while (nextFiber) {
      if (nextFiber.sibling) {
        return nextFiber.sibling;
      }
      nextFiber = nextFiber.parent;
    }
  }
}
var CustomReact = {
  createElement: createElement,
  render: render
};
var element = CustomReact.createElement("h1", null, "ok what is upp");
var container = document.getElementById("root");
console.log(container);
CustomReact.render(element, container);
