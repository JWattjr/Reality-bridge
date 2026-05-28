import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Basic ")) {
      throw new UnauthorizedException("Missing admin credentials");
    }

    try {
      const credentialsBase64 = authHeader.slice(6); // Remove "Basic " prefix
      const credentialsStr = Buffer.from(credentialsBase64, "base64").toString("utf-8");
      const [username, password] = credentialsStr.split(":");

      const expectedUsername = process.env.ADMIN_DASHBOARD_USERNAME || "admin";
      const expectedPassword = process.env.ADMIN_DASHBOARD_PASSWORD || "proofplay2026";

      if (username === expectedUsername && password === expectedPassword) {
        return true;
      }
    } catch (error) {
      throw new UnauthorizedException("Invalid admin authorization format");
    }

    throw new UnauthorizedException("Incorrect admin credentials");
  }
}
