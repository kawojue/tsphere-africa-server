type UserStatus = 'active' | 'suspended'
type Role = 'admin' | 'talent' | 'creative' | 'client'

interface ExpressUser extends Express.User {
    sub: string
    role: Role
    userStatus?: UserStatus
}

interface IRequest extends Request {
    user: ExpressUser
}

interface JwtPayload {
    sub: string
    role: Role
    userStatus?: UserStatus
}