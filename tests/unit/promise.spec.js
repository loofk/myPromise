const MyPromise = require('../../myPromise')

// 测试MyPromise.resolve方法
describe('test MyPromise.resolve', () => {
  // 传入MyPromise实例
  test('get MyPromise parameter', async () => {
    const p = new MyPromise((resolve, reject) => reject(1))
    const p2 = MyPromise.resolve(p)

    try {
      await p2
    } catch (err) {
      expect(err).toBe(1)
    }
  })

  // 传入thenable对象
  test('get thenable parameter', async () => {
    const thenable = {
      name: 'liu',
      then (resolve, reject) {
        setTimeout(() => {
          resolve(this.name)
        }, 1000)
      }
    }
    const p = MyPromise.resolve(thenable)

    let name = await p
    expect(name).toBe('liu')
  })

  // 不传参数
  test('no parameter', async () => {
    let val = await MyPromise.resolve().then(() => '123')
    expect(val).toBe('123')
  })
})

// 测试MyPromise.reject方法
describe('test MyPromise.reject', () => {
  // 参数会作为reject的理由
  test('test parameters', async () => {
    let str = 'error'
    let num = 1
    let obj = {}
    let thenable = {
      name: 'liu',
      then (resolve, reject) {
        resolve(this.name)
      }
    }
    let p = new MyPromise(resolve => resolve(1))

    try {
      await MyPromise.reject(str)
    } catch (err) {
      expect(err).toBe('error')
    }

    try {
      await MyPromise.reject(num)
    } catch (err) {
      expect(err).toBe(1)
    }

    try {
      await MyPromise.reject(obj)
    } catch (err) {
      expect(err).toBe(obj)
    }

    try {
      await MyPromise.reject(thenable)
    } catch (err) {
      expect(err).toBe(thenable)
    }

    try {
      await MyPromise.reject(p)
    } catch (err) {
      expect(err).toBe(p)
    }
  })
})

// 测试finally方法
describe('test finally', () => {
  // 不论成功失败，finally都会执行
  test('finally worked whatever success nor failed', async () => {
    let val = ''

    await MyPromise.resolve().finally(() => {
      val = 'here'
    })
    expect(val).toBe('here')

    try {
      await MyPromise.reject().finally(() => {
        val = 'none'
      })
      expect(val).toBe('none')
    } catch {}
  })

  // finally不接收任何参数
  test('finally dont\'t need parameters', async () => {
    let val = ''

    await MyPromise.resolve().finally(value => {
      val = value
    })
    expect(val).toBe(undefined)
  })

  // finally会将成功的结果或失败的原因原封不动的返回
  test('finally dont\'t process the status and always return it', async () => {
    let val = ''

    await MyPromise.resolve(1).finally().then(res => {
      val = res
    })
    expect(val).toBe(1)

    await MyPromise.reject(1).finally().catch(err => {
      val = err
    })
    expect(val).toBe(1)
  })
})

// 测试MyPromise.all方法
describe('test MyPromise.all', () => {
  // 参数不是promise数组
  test('parameter\'s type isn\'t promise', async () => {
    let arr = await MyPromise.all([5, 4, 3, 2, 1])
    expect(arr).toEqual([5, 4, 3, 2, 1])
  })

  // 所有的promise都成功才fulfilled，并返回一个结果数组
  test('succeed', async () => {
    let p = [5, 4, 3, 2, 1].map(item => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(item)
        }, 100 * item)
      })
    })

    let arr = await MyPromise.all(p)
    expect(arr).toEqual([5, 4, 3, 2, 1])
  })

  // 其中任何一个reject都会导致状态变为rejected，返回导致rejected的理由
  test('failed', async () => {
    let p = [5, 4, 3, 2, 1].map(item => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          item === 1 ? reject(item) : resolve(item)
        }, 100 * item)
      })
    })

    try {
      await MyPromise.all(p)
    } catch (err) {
      expect(err).toBe(1)
    }
  })
})

// 测试MyPromise.race方法
describe('test MyPromise.race', () => {
  // 参数不是promise数组
  test('parameter\'s type isn\'t promise', async () => {
    let arr = await MyPromise.race([5, 4, 3, 2, 1])
    expect(arr).toEqual(5)
  })

  // 状态依赖于最先改变的那个promise
  // 成功时
  test('succeed', async () => {
    let p = [5, 4, 3, 2, 1].map(item => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          resolve(item)
        }, 100 * item)
      })
    })

    let arr = await MyPromise.race(p)
    expect(arr).toEqual(1)
  })

  // 失败时
  test('failed', async () => {
    let p = [1, 2, 3, 4, 5].map(item => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          item === 1 ? reject(item) : resolve(item)
        }, 100 * item)
      })
    })

    try {
      await MyPromise.race(p)
    } catch (err) {
      expect(err).toBe(1)
    }
  })
})

// 测试MyPromise.any方法
describe('test MyPromise.any', () => {
  // 参数不是promise数组
  test('parameter\'s type isn\'t promise', async () => {
    let arr = await MyPromise.any([5, 4, 3, 2, 1])
    expect(arr).toEqual(5)
  })

  // 只要其中一个resolve状态就变为fulfilled，且返回其结果
  test('succeed', async () => {
    let p = [5, 4, 3, 2, 1].map(item => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          item === 2 ? resolve(item) : reject(item)
        }, 100 * item)
      })
    })

    let arr = await MyPromise.any(p)
    expect(arr).toEqual(2)
  })

  // 所有都reject，返回失败的原因数组
  test('failed', async () => {
    let p = [1, 2, 3, 4, 5].map(item => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          reject(item)
        }, 100 * item)
      })
    })

    try {
      await MyPromise.any(p)
    } catch (err) {
      expect(err).toEqual([1, 2, 3, 4, 5])
    }
  })
})

// 测试MyPromise.allSettled方法
describe('test MyPromise.allSettled', () => {
  // 参数不是promise数组
  test('parameter\'s type isn\'t promise', async () => {
    let expected = [
      { status: 'fulfilled', value: 5 },
      { status: 'fulfilled', value: 4 },
      { status: 'fulfilled', value: 3 },
      { status: 'fulfilled', value: 2 },
      { status: 'fulfilled', value: 1 }
    ]
    let arr = await MyPromise.allSettled([5, 4, 3, 2, 1])
    expect(arr).toEqual(expected)
  })

  // 其中的promise成功或失败都不会导致rejected，只是返回所有promise的处理结果
  test('succeed', async () => {
    let expected = [
      { status: 'fulfilled', value: 5 },
      { status: 'fulfilled', value: 4 },
      { status: 'rejected', reason: 3 },
      { status: 'fulfilled', value: 2 },
      { status: 'fulfilled', value: 1 }
    ]
    let p = [5, 4, 3, 2, 1].map(item => {
      return new Promise((resolve, reject) => {
        setTimeout(() => {
          item === 3 ? reject(item) : resolve(item)
        }, 100 * item)
      })
    })

    let arr = await MyPromise.allSettled(p)
    expect(arr).toEqual(expected)
  })
})