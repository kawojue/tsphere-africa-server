import { Request } from 'express'
import { Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { AuthService } from 'src/auth/auth.service'
import { Strategy, Profile, VerifyCallback } from 'passport-google-oauth20'

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
    constructor(private readonly authService: AuthService) {
        super({
            passReqToCallback: true,
            clientID: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            callbackURL: '/auth/google/callback',
            scope: ['profile', 'email'],
        })
    }

    async validate(
        request: Request,
        accessToken: string,
        refreshToken: string,
        profile: Profile,
        done: VerifyCallback,
    ): Promise<any> {
        try {
            const access_token = await this.authService.googleAuth(request, refreshToken, accessToken, profile)
            done(null, { access_token })
        } catch (error) {
            done(error, false)
        }
    }
}
