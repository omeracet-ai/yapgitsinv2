# Code Style & Conventions

## TypeScript/NestJS Standards
- **Naming:** camelCase for variables/methods, PascalCase for classes/types, UPPER_SNAKE_CASE for constants
- **Entity files:** `[name].entity.ts`
- **Service files:** `[name].service.ts`
- **Controller files:** `[name].controller.ts`
- **Module files:** `[name].module.ts`
- **DTO files:** `[name].dto.ts` in `dto/` subfolder
- **Decorators:** Use NestJS decorators (@Injectable, @Controller, @Get, etc.)

## TypeORM Entity Patterns
- All entities have `@PrimaryGeneratedColumn('uuid')` for id
- Use `@CreateDateColumn()` and `@UpdateDateColumn()` for timestamps
- Foreign keys: `@ManyToOne`, `@OneToMany`, `@JoinColumn({ name: 'fkName' })`
- Multi-tenant: `tenantId: string | null` column on most entities
- Enums: Use TypeScript enums, `@Column({ type: 'simple-enum', enum: MyEnum })`

## Code Patterns
- **Rating calculation:** Use `bayesianAverage()` and `wilsonScore()` from common/rating.util.ts
- **Phase comments:** Document new features with `// Phase NNN — description`
- **Async operations:** Use async/await, Services use @InjectRepository
- **Error handling:** NestJS exceptions (BadRequestException, NotFoundException, ForbiddenException)
- **Validation:** class-validator with decorators on DTOs

## Formatting
- Prettier configured: 80-100 char lines (check .prettierrc)
- ESLint: TypeScript ESLint setup
- Auto-format on save or run `npm run format`

## Comment Style
- Document complex logic with `/** JSDoc */` comments
- Phase tags: `// Phase NNN — description`
- Keep comments concise, use Turkish where appropriate (Türkçe terminoloji)
