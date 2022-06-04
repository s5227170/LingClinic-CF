export default class CustomError extends Error {
  status: number;
  message: string;
  data: string[];
  constructor(message: string) {
    super(message);
    this.status = 500;
    this.message = message;
    this.data = [];
  }
}
