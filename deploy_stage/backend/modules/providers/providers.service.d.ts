import { Repository } from 'typeorm';
import { Provider } from './provider.entity';
export declare class ProvidersService {
    private repo;
    constructor(repo: Repository<Provider>);
    findAll(): Promise<Provider[]>;
    setVerified(id: string, isVerified: boolean): Promise<Provider>;
    setFeaturedOrder(id: string, featuredOrder: number | null): Promise<Provider>;
}
