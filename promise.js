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
    fn()
    return val
  }, err => {
    fn()
    throw err
  })
}

MyPromise.resolve = function (val) {
  if (val instanceof MyPromise) return val

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
  // 传入的不是数组类型，转化为数组
  if (!Array.isArray(promises)) {
    promises = [promises]
  }

  return new MyPromise((resolve, reject) => {
    let res = []
    let len = promises.length
    let count = 0

    promises.forEach((promise, index) => {
      promise.then(val => {
        res[index] = val
        count++

        if (count === len) resolve(res)
      }).catch(err => reject(err))
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