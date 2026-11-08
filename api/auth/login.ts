import {type AuthEnv, handleLogin} from '../_lib/authHandlers.js'

export function GET(request: Request) {
  return handleLogin(request, process.env as AuthEnv)
}
