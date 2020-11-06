## 背景

远古时期，前端开发者们都是使用回调函数来处理异步通信的，在`ajax`的成功回调中处理返回的数据，如果下一次请求的数据依赖于上一次的请求结果，就需要把下一次请求动作写在上一次请求的成功回调中，如果重复几次，代码就会往右横向发展，不容易维护

一个很容易想到的解决方式是在外部定义成功回调函数，然后请求成功时执行方法，这样的话就可以把各个请求都封装到不同的函数中，按顺序调用就好

`ES6`的`Promise`就是沿着这个思路实现的，它使用了状态机的模型，内部维护着一个对象，该对象有三个状态`pending/fulfilled/rejected`，当请求结果未出时，只是把回调函数保存到内部的一个队列中，等到状态随着请求完成变更后，根据不同的状态执行不一样的操作，比如如果状态变更为`fulfilled`，就取出成功回调队列依次用拿到的结果执行

## 难点

### 内部实现resolve和reject

如果使用过`Promise`就会发现，我们传入一个函数，该函数内部有异步操作，并且该函数自动拥有`resolve`和`reject`作为参数的方法，让我们可以在请求成功时调用`resolve`，失败时调用`reject`，调用者两个方法的目的就是执行我们编写的回调函数，所以简单实现一下

```
function resolve (val) {
  // 只有在状态为pending时才执行回调
  if (this.status === 'pending') {
    this.status = 'fulfilled'

    this.val = val
    this.onFulFilledCb.forEach(fn => fn())
  }
}

function reject (err) {
  if (this.status === 'pending') {
    this.status = 'rejected'

    this.err = err
    this.onRejectedCb.forEach(fn => fn())
  }
}
```

### 实现then方法

正常用`Promise`来实现异步操作时，回调是后写的，我们通过`then`方法传入成功或失败的回调，所以在`then`方法的内部就是判断当前`Promise`对象的状态，如果是`pending`的状态，就把回调插入到队列中等待调用，否则直接调用

```
MyPromise.prototype.then = function (onSuccess, onFailed) {
  if (this.status === 'pending') {
    this.onFulFilledCb.push(() => {
      setTimeout(() => {
        onSuccess(this.val)
      })
    })

    this.onRejectedCb.push(() => {
      setTimeout(() => {
        onFailed(this.err)
      })
    })
  } else if (this.status === 'fulfilled') {
      setTimeout(() => {
        onSuccess(this.val)
      })
  } else {
      setTimeout(() => {
        onFailed(this.err)
      })
  }
}
```

### 实现链式调用

我们都知道`Promise`是支持链式调用的，我们可以在一个`then`方法后面紧跟另一个`then`，并且后一个`Promise`的状态依赖于前者的状态，所以前面的实现需要重新调整，我们必须返回一个新的`Promise`

```
MyPromise.prototype.then = function (onSuccess, onFailed) {
  let promise2 = null
  let self = this

  if (self.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {
      self.onFulFilledCb.push(() => {
        setTimeout(() => {
          try {
            let res = onSuccess(self.val)
            resolve(res)
          } catch (err) {
            reject(err)
          }
        })
      })

      self.onRejectedCb.push(() => {
        setTimeout(() => {
          try {
            let res = onFailed(self.val)
            resolve(res)
          } catch (err) {
            reject(err)
          }
        })
      })
    })
  } else if (self.status === 'fulfilled') {
    promise2 = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        try {
          let res = onSuccess(self.val)
          resolve(res)
        } catch (err) {
          reject(err)
        }
      })
    })
  } else {
    promise2 = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        try {
          let res = onFailed(self.val)
          resolve(res)
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  return promise2
}
```

### 细节的处理

上面只是描述了主要流程，对一些细节没有处理的很好，下面补充一下

1.在使用`Promise`时传入的异步操作可能会发生错误，对于这类错误我们也应该抛出
```
function MyPromise (fn) {
  this.status = 'pending'
  this.val = null
  this.err = null
  this.onFulFilledCb = []
  this.onRejectedCb = []


  function resolve () {
    // code...
  }

  function reject () {
    // code...
  }

  try {
    fn (resolve, reject)
  } catch (err) {
    reject(err)
  }
}
```

2.在使用`then`方法时，是支持不传参数的，这说明内部有对缺省参数的处理，我们也试着实现一下
```
MyPromise.prototype.then = function (onSuccess, onFailed) {
  onSuccess = typeof onSuccess === 'function' ? onSuccess : val => val
  onFailed = typeof onFailed === 'function' ? onFailed : err => { throw err }

  // code...
}
```

3.我们传入的回调函数不总是能返回正常值，也有可能是`Promise`对象或者`thenable`对象，如果是这两类对象，还需要根据它们的状态决定，实现一个`Promise`处理程序

```
function resolvePromise (promise2, x, resolve, reject) {
  // 传入的回调结果不能和promise2相同
  if (promise2 === x) {
    throw new TypeError('same promise')
  }

  // 如果x是Promise对象，则递归自身
  if (x instanceof MyPromise) {
    x.then(y => resolvePromise(promise2, y, resolve, reject))
      .catch(err => reject(err))
  } else if (typeof x === 'object' && x !== null || typeof x === 'function') {   // 如果是thenable对象，处理其then方法
    try {
      let then = x.then
      let called = false

      if (typeof then === 'function') {
        try {
          then.call(x, y => {
            if (!called) {
              called = true
              resolvePromise(promise2, y, resolve, reject)
            }
          }, err => {
            if (!called) {
              called = true
              reject(err)
            }
          })
        } catch (err) {
          if (!called) {
            called = true
            reject(err)
          }
        }
      } else {
        resolve(x)
      }
    } catch (err) {
      rehect(err)
    }
  } else {
    resolve(x)
  }
}
```

把所有用到回调函数的值的地方都调用一下这个处理程序
```
let res = onSuccess(this.val)
resolvePromise(res)
```

## 总结

`Promise`的出现并没有改变`JS`的执行内核，其本质上仍然是异步的，只是写法的改变使得我们不必在异步回调中就传入处理，而是可以在任何时候处理异步的结果，所需要的仅仅是调用`Promise`对象的`then`方法或者`catch`方法

随着`JS`标准的演进，新的语法往往更加便利，但是我们在使用新语法时也需要了解其底层是如何实现的，后面的`generator`函数和`async`函数实际上都是在`Promise`的基础上进一步发展而来