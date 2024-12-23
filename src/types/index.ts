import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export interface User {
  email: string;
  password?: string;
  name?: string;
  sub?: string;
  isAdmin?: boolean;
}

export interface AuthenticatedEvent extends APIGatewayProxyEvent {
  user?: {
    sub: string;
    email: string;
    isAdmin: boolean;
  };
}

export type LambdaHandler = (
  event: APIGatewayProxyEvent | AuthenticatedEvent,
  context: any
) => Promise<APIGatewayProxyResult>;

export interface CognitoServiceConfig {
  region: string;
  userPoolId: string;
  clientId: string;
}
