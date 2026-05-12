# Task Completion Checklist

After completing code work in nestjs-backend:

1. **Format & Lint**
   ```bash
   npm run format
   npm run lint
   ```

2. **Verify Compilation**
   ```bash
   npm run build
   ```

3. **Test (if applicable)**
   ```bash
   npm run test
   ```

4. **Migration (for new entities)**
   ```bash
   npm run migration:generate -- -n [FeatureNameDescription]
   # Review generated migration
   npm run migration:run
   ```

5. **Git Commit**
   - Feature: `feat(module-name): description`
   - Fix: `fix(module-name): description`
   - Docs: `docs: description`
   - Format: `style: lint + format`

6. **Documentation**
   - Update API comments with @ApiOperation, @ApiResponse in controllers
   - Document new endpoints in OpenAPI/Swagger
   - Update phase comments for traceability

## Common NestJS Commands
- Generate module: `nest g module modules/feature-name`
- Generate service: `nest g service modules/feature-name`
- Generate controller: `nest g controller modules/feature-name`
- Generate class: `nest g class modules/feature-name/feature.entity`

## Git Conventions
- Work on feature branches or commit directly to master (per project setup)
- Squash/rebase before push if needed
- Always run lint + format before commit
