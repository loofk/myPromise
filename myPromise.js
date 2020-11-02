function MyPromise(fn) {
  this.status = 'pending'
  this.val = null
  this.err = null
  this.onFulfilledCb = []
  this.onRejectedCb = []

  const resolve = val => {
    if (this.status === 'pending') {
      this.status = 'fulfilled'
      this.val = val
      this.onFulfilledCb.forEach(fn => fn())
    }
  }

  const reject = err => {
    if (this.status === 'pending') {
      this.status = 'rejected'
      this.err = err
      this.onRejectedCb.forEach(fn => fn())
    }
  }

  try {
    fn(resolve, reject)
  } catch (err) {
    reject(err)
  }
}

// Promise处理程序
function resolvePromise(promise2, x, resolve, reject) {
  // 传入的值不能与自身相同，否则会发生循环引用
  if (x === promise2) reject(new TypeError('same promise'))

  // 判断是否为promise对象，递归处理
  if (x instanceof MyPromise) {
    x.then(val => resolvePromise(promise2, val, resolve, reject))
      .catch(err => reject(err))
  } else if ((typeof x === 'object' && x !== null) || typeof x === 'function') { // 处理对象或函数
    try {
      let then = x.then

      if (typeof then === 'function') {
        let called = false

        try {
          then.call(x, y => {
            if (!called) {
              resolvePromise(promise2, y, resolve, reject)
              called = true
            }
          }, err => {
            if (!called) {
              reject(err)
              called = true
            }
          })
        } catch (err) {
          if (!called) {
            reject(err)
          }
        }
      } else {
        resolve(x)
      }
    } catch (err) {
      reject(err)
    }
  } else { // 其他值直接resolve
    resolve(x)
  }
}

MyPromise.prototype.then = function (onFulfilled, onRejected) {
  onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : r => r
  onRejected = typeof onRejected === 'function' ? onRejected : r => { throw r }

  let promise2
  let self = this

  if (self.status === 'pending') {
    promise2 = new MyPromise((resolve, reject) => {
      self.onFulfilledCb.push(() => {
        setTimeout(() => {
          try {
            let res = onFulfilled(self.val)
            resolvePromise(promise2, res, resolve, reject)
          } catch (err) {
            reject(err)
          }
        })
      })

      self.onRejectedCb.push(() => {
        setTimeout(() => {
          try {
            let res = onRejected(self.err)
            resolvePromise(promise2, res, resolve, reject)
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
          let res = onFulfilled(self.val)
          resolvePromise(promise2, res, resolve, reject)
        } catch (err) {
          reject(err)
        }
      })
    })
  } else {
    promise2 = new MyPromise((resolve, reject) => {
      setTimeout(() => {
        try {
          let res = onRejected(self.err)
          resolvePromise(promise2, res, resolve, reject)
        } catch (err) {
          reject(err)
        }
      })
    })
  }

  return promise2
}

MyPromise.prototype.catch = function (fn) {
  return this.then(null, fn)
}

MyPromise.prototype.finally = function (fn) {
  return this.then(val => {
    fn && fn()
    return val
  }, err => {
    fn && fn()
    throw err
  })
}

MyPromise.resolve = function (val) {
  // promise对象
  if (val instanceof MyPromise) return val

  // thenable对象
  if (typeof val === 'object' && val !== null || typeof val === 'function') {
    let then = val.then

    if (typeof then === 'function') {
      return new Promise((resolve, reject) => {
        try {
          then.call(val, resolve, reject)
        } catch (err) {
          reject(err)
        }
      })
    }
  }

  return new MyPromise(resolve => {
    resolve(val)
  })
}

MyPromise.reject = function (err) {
  return new MyPromise((resolve, reject) => {
    reject(err)
  })
}

MyPromise.all = function (promises) {
  // 传入的不是数组类型，报错
  if (!Array.isArray(promises)) {
    throw new TypeError('parameters should be Array')
  }

  return new MyPromise((resolve, reject) => {
    let res = []
    let len = promises.length
    let count = 0
    let index = 0

    // forEach支持异步，而普通for循环不支持
    for (let i = 0; i < len; i++) {
      let promise = promises[i]

      MyPromise.resolve(promise).then(val => {
        res[i] = val
        count++

        if (count === len) resolve(res)
      }).catch(err => reject(err))
    }
  })
}

MyPromise.race = function (promises) {
  // 传入的不是数组类型，报错
  if (!Array.isArray(promises)) {
    throw new TypeError('parameters should be Array')
  }

  return new MyPromise((resolve, reject) => {
    promises.forEach((promise, index) => {
      MyPromise.resolve(promise).then(val => {
        resolve(val)
      }).catch(err => reject(err))
    })
  })
}

MyPromise.any = function (promises) {
  // 传入的不是数组类型，报错
  if (!Array.isArray(promises)) {
    throw new TypeError('parameters should be Array')
  }

  return new MyPromise((resolve, reject) => {
    let res = []
    let len = promises.length
    let count = 0

    // forEach支持异步，而普通for循环不支持
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

MyPromise.allSettled = function (promises) {
  // 传入的不是数组类型，报错
  if (!Array.isArray(promises)) {
    throw new TypeError('parameters should be Array')
  }

  return new MyPromise((resolve, reject) => {
    let res = []
    let len = promises.length
    let count = 0

    // forEach支持异步，而普通for循环不支持
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

// PromiseA+ 测试桩
MyPromise.deferred = function () {
  let res = {}

  res.promise = new MyPromise((resolve, reject) => {
    res.resolve = resolve
    res.reject = reject
  })

  return res
}

module.exports = MyPromise