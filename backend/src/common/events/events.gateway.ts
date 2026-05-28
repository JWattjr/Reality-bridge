import { WebSocketGateway, WebSocketServer, OnGatewayConnection, OnGatewayDisconnect } from "@nestjs/websockets";
import { Server, Socket } from "socket.io";

@WebSocketGateway({
  cors: {
    origin: "*",
  },
})
export class EventsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Client connected to websocket: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected from websocket: ${client.id}`);
  }

  sendPredictionUpdated(prediction: any) {
    if (this.server) {
      this.server.emit("predictionUpdated", prediction);
    }
  }

  sendProfileUpdated(profile: any) {
    if (this.server) {
      this.server.emit("profileUpdated", profile);
    }
  }
}
