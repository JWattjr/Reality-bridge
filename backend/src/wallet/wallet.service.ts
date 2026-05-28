import { Injectable } from "@nestjs/common";
import { getXLayerOKBBalance } from "@/shared/xlayer";

@Injectable()
export class WalletService {
  async getBalance(address: string): Promise<any> {
    return getXLayerOKBBalance(address);
  }
}
