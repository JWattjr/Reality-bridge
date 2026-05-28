import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { PrivyClient } from '@privy-io/node';
import { Db } from 'mongodb';
import { MONGO_COLLECTIONS } from '@/common/database/collections';

@Injectable()
export class PrivyAuthGuard implements CanActivate {
  private privyClient: PrivyClient | null = null;

  constructor(
    @Inject('DATABASE_CONNECTION')
    private readonly db: Db,
  ) {
    const appId = process.env.PRIVY_APP_ID;
    const appSecret = process.env.PRIVY_APP_SECRET;

    if (appId && appSecret) {
      this.privyClient = new PrivyClient({ appId, appSecret });
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // Privy server auth is not configured - accept any request userId for local development fallback
    if (!this.privyClient) {
      const userId = request.query?.userId || request.body?.userId;
      if (!userId) {
        throw new UnauthorizedException(
          'Sign in required. (Local dev mode: please provide userId query/body param)',
        );
      }
      request.user = { userId, walletAddresses: [userId] };
      return true;
    }

    const authHeader = request.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const token = authHeader.slice(7);

    try {
      const claims = await this.privyClient
        .utils()
        .auth()
        .verifyAccessToken(token);

      const privyUserId = claims.user_id;

      // 1. Database-first lookup: check if user already exists in MongoDB
      const existingUser = await this.db
        .collection(MONGO_COLLECTIONS.users)
        .findOne({ id: privyUserId });

      if (existingUser && existingUser.walletAddress) {
        request.user = {
          userId: privyUserId,
          walletAddresses: [existingUser.walletAddress],
        };
        return true;
      }

      // 2. Fetch from Privy API if not in DB or missing wallet address
      const user = await this.privyClient.users()._get(privyUserId);
      const walletAddresses = user.linked_accounts
        .map((account) => {
          if (
            (account.type === 'wallet' || account.type === 'smart_wallet') &&
            'address' in account &&
            typeof account.address === 'string'
          ) {
            return account.address;
          }
          return null;
        })
        .filter((address): address is string => Boolean(address));

      request.user = {
        userId: privyUserId,
        walletAddresses,
      };

      return true;
    } catch (error) {
      console.error('PrivyAuthGuard validation failed:', error);
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }
}
