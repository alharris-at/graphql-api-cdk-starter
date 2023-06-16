/**
 * Entry point for our lambda.
 */
export const handler = (event: any, _: any, callback: (errorMsg: string | null, responseMsg?: string | null) => void) => {
  const messageToEcho: string = event.arguments.message;
  if (!messageToEcho) {
    callback('Didn\'t receive a `message` to echo')
  }
  callback(null, `${messageToEcho}.. ${messageToEcho.toLowerCase()}`);
};
