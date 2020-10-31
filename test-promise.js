const MyPromise = require('./promise')
const { resolve } = require('./promise')

function createPromise(val, fail) {
  return new MyPromise((resolve, reject) => {
    setTimeout(() => {
      fail ? reject(val) : resolve(val)
    }, 2000)
  })
}

let p = MyPromise.all([createPromise(1, true), createPromise(2), createPromise(3), createPromise(4), createPromise(5)])

p.finally(() => console.log('I am always run'))
  .then(res => console.log(res))
  .catch(err => console.log(err))