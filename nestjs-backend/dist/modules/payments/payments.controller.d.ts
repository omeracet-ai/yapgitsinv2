import { PaymentsService } from './payments.service';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    createSession(body: any): Promise<unknown>;
    callback(body: any, res: any): Promise<any>;
}
