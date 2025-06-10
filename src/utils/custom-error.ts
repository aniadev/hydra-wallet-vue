export class AniError extends Error {
  status: string
  message: string
  reason: any
  trace: any
  data: unknown

  constructor(option: string | Partial<AniError>) {
    if (typeof option === 'string') {
      super(option)
      this.status = 'ERROR'
      this.message = option
      this.reason = null
      this.trace = null
      this.data = null
      Object.setPrototypeOf(this, AniError.prototype)
      return
    }
    const { status = 'ERROR', message, reason, trace, data } = option
    super(message)
    this.status = status
    this.message = message || ''
    this.reason = reason
    this.trace = trace
    this.data = data
    Object.setPrototypeOf(this, AniError.prototype)
  }
}
