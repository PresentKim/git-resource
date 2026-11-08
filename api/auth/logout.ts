import {handleLogout} from '../_lib/authHandlers.js'

export function POST(request: Request) {
  return handleLogout(request)
}
