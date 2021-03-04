import o from 'ospec'
import { makePromise } from '../../lib/async.js'


o.spec( 'makePromise', () => {
  let { promise, reject, resolve } = makePromise()

  o.beforeEach(() => ({ promise, reject, resolve } = makePromise()))

  o.spec( 'resolve', () => {
    o( 'default', async () => {
      resolve()
      o( await promise ).equals()
    })

    o( 'passed value', async () => {
      resolve( 'test' )
      o( await promise ).equals( 'test' )
    })
  })

  o.spec( 'reject', () => {
    o( 'default', done => {
      // eslint-disable-next-line promise/no-callback-in-promise
      promise.catch( e => { o( e ).equals(); done()})
      reject()
    })

    o( 'passed value', done => {
      // eslint-disable-next-line promise/no-callback-in-promise
      promise.catch( e => { o( e ).equals( 'test' ); done()})
      reject( 'test' )
    })
  })
})
