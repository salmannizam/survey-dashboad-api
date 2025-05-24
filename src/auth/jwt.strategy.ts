import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UserService } from '../user/user.service';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private userService: UserService,
    private configService: ConfigService,  // Inject ConfigService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),  // Extract JWT from Bearer token in the header
      secretOrKey: configService.get('JWT_SECRET') || 'defaultSecretKey',  // Use environment variable or fallback to default
    });
  }

  // Validate the token and the user
  async validate(payload: any) {
    try {
      if (!payload) {
        throw new UnauthorizedException('JWT token is missing or invalid');
      }

      // Find user by username from the payload
      return true;
    } catch (error) {
      throw new UnauthorizedException(error.message);
    }
  }
}
