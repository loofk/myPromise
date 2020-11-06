## 前言

`Promise`实现了一些基本的实例方法和静态方法方便我们使用，下面介绍一下这些方法的实现

## catch

`catch`实际上是`then`方法的语法糖，我们知道`then`方法可以传入成功和失败的回调，如果我们只传入失败的回调，成功的结果就会被直接传递给下一个`Promise`
```
MyPromise.prototype.catch = function (onFailed) {
  return this.then(null, onFailed)
}
```

## finally

`finally`方法不接收结果，只要`Promise`的状态发生改变，它就一定会执行传入的函数，并且结果会被原封不动的返回给下一个`Promise`，我们沿着这个思路实现一下
```
MyPromise.prototype.catch = function (fn) {
  return this.then(val => {
    fn && fn()
    return val
  }, err => {
    fn && fn()
    throw err
  })
}
```

## Promise.resolve

该方法会把原始值转成一个状态已经变为`fulfilled`的`Promise`，而对于`Promise`对象和`thenable`对象需要额外处理
```
MyPromise.resolve = function (val) {
  // promise对象
  if (val instanceof MyPromise) return val

  // thenable对象
  if (typeof val === 'object' && val !== null || typeof val === 'function') {
    return new MyPromise((resolve, reject) => {
      try {
        let then = val.then

        if (typeof then === 'function') {
          try {
            then.call(val, resolve, reject)
          } catch (err) {
            reject(err)
          }
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  return new MyPromise(resolve => {
    resolve(val)
  })
}
```

## Promise.reject

`reject`方法返回一个带有错误原因的`Promise`对象
```
MyPromise.reject = function (err) {
  return new MyPromise((resolve, reject) => {
    reject(err)
  })
}
```

## Promise.all

`all`方法会接收一组`Promise`对象，对于不是`Promise`对象的数组元素会内部转为`Promise`对象再处理，它的主要特征是只有所有的`Promise`对象都成功才会输出成功的结果数组，否则新的`Promise`对象状态为失败且失败信息就是导致失败的那个`Promise`
```
MyPromise.all = function (promises) {
  return new MyPromise((resolve, reject) => {
    let res = []
    let count = 0

    promises.forEach((promise, index) => {
      MyPromise.resolve(promise).then(val => {
        res[index] = val
        count++

        if (count === promises.length) resolve(res)
      }).catch(err => reject(err))
    })
  })
}
```

## Promise.allSettled

`allSettled`方法是一个新增的方法，它和`all`方法类似，只是它不会被错误中断，而只是简单的执行每个`Promise`返回其结果数组
```
MyPromise.allSettled = function (promises) {
  return new MyPromise((resolve, reject) => {
    let res = []
    let len = promises.length
    let count = 0

    promises.forEach((promise, index) => {
      MyPromise.resolve(promise).then(val => {
        let obj = { status: 'fulfilled', value: val }
        res[index] = obj
        count++

        if (count === len) resolve(res)
      }).catch(err => {
        let obj = { status: 'rejected', reason: err }
        res[index] = obj
        count++

        if (count === len) resolve(res)
      })
    })
  })
}
```

## Promise.race

`race`方法如其名，表示只输出传入`Promise`数组中状态改变最快的那个`Promise`的结果，不论成功失败
```
MyPromise.race = function (promises) {
  return new MyPromise((resolve, reject) => {
    promises.forEach((promise, index) => {
      MyPromise.resolve(promise).then(val => {
        resolve(val)
      }).catch(err => reject(err))
    })
  })
}
```

## Promise.any

`any`方法和`all`方法正好相反，它是返回第一个成功的`Promise`的结果，只有当所有`Promise`都失败时才会把状态改为`rejected`
```
MyPromise.any = function (promises) {
  return new MyPromise((resolve, reject) => {
    let res = []
    let len = promises.length
    let count = 0

    promises.forEach((promise, index) => {
      MyPromise.resolve(promise).then(val => {
        resolve(val)
      }).catch(err => {
        res[index] = err
        count++

        if (count === len) reject(res)
      })
    })
  })
}
```