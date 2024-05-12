// TODO: Delete this when swc-node supports `Promise.withResolvers`.
// @ts-ignore
Promise.withResolvers ||= () => {
  let resolve, reject
  const promise = new Promise((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}
