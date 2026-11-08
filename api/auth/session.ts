import {type AuthEnv, handleSession} from '../_lib/authHandlers.js'

export function GET(request: Request) {
  return handleSession(request, process.env as AuthEnv, fetch, Date.now())
}
