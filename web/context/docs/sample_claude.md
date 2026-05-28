# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## 🔴 CRITICAL: STRICT TDD ENFORCEMENT 🔴

**This project follows MANDATORY Test-Driven Development (TDD).**

**Golden Rule**: NEVER write implementation code before writing a failing test.

**Red-Green-Refactor Cycle**:

1. 🔴 **RED**: Write ONE failing test → STOP and wait for user confirmation
2. 🟢 **GREEN**: Write minimal implementation → STOP and wait for "继续"
3. 🔵 **REFACTOR**: Improve code without changing behavior → Wait for "重构"

See [Development Process](#development-process) section for complete TDD workflow.

---

## Project Overview

This is an EchoBay Affiliate Backend built with NestJS - a progressive Node.js framework for building efficient, scalable server-side applications. The project uses TypeScript with modern module resolution (nodenext) and is configured with strict type checking enabled.

## Development Philosophy

### Core Principles

- **Incremental progress over big bangs** - Small changes that compile and pass tests
- **Learning from existing code** - Study and plan before implementing
- **Pragmatic over dogmatic** - Adapt to project reality
- **Clear intent over clever code** - Be boring and obvious

### Simplicity Guidelines

- Single responsibility per function/class
- Avoid premature abstractions
- No clever tricks - choose the boring solution
- If you need to explain it, it's too complex

## Package Manager

**IMPORTANT**: This project uses `pnpm` as the package manager. Always use `pnpm` commands, not `npm` or `yarn`.

## Development Commands

### Running the Application

```bash
pnpm run start:dev        # Development mode with watch/hot-reload
pnpm run start            # Standard development mode
pnpm run start:debug      # Debug mode with watch
pnpm run start:prod       # Production mode (uses compiled dist/)
```

### Building

```bash
pnpm run build            # Compiles TypeScript to dist/
```

### Testing

```bash
pnpm run test             # Run unit tests
pnpm run test:watch       # Run tests in watch mode
pnpm run test:cov         # Run tests with coverage report
pnpm run test:e2e         # Run end-to-end tests
pnpm run test:debug       # Debug tests with inspector
```

### Code Quality

```bash
pnpm run lint             # Run ESLint with auto-fix
pnpm run format           # Format code with Prettier
```

## TypeScript Configuration

- **Module System**: Using `nodenext` module resolution with ESM interop
- **Target**: ES2023
- **Decorators**: Enabled (required for NestJS)
- **Strict Mode**: Partial - `strictNullChecks` enabled but `noImplicitAny` disabled
- **Source Maps**: Enabled for debugging

## Code Style & Linting

### ESLint Rules

- Uses TypeScript ESLint with recommended type-checked rules
- Prettier integration for formatting consistency
- Key rule overrides:
  - `@typescript-eslint/no-explicit-any`: OFF (allows `any` type)
  - `@typescript-eslint/no-floating-promises`: WARN
  - `@typescript-eslint/no-unsafe-argument`: WARN
  - End of line set to "auto" for cross-platform compatibility

### Prettier Configuration

- Single quotes for strings
- Trailing commas everywhere

**IMPORTANT**: All lint issues (warnings and errors) must be fixed before committing. Do not ignore or suppress warnings.

### TypeScript Code Quality Standards

**CRITICAL RULES**:

- **NO `any` type**: The `any` keyword is STRICTLY FORBIDDEN in production code
- **NO `unknown` type**: The `unknown` keyword is also STRICTLY FORBIDDEN
- **Type Safety First**: Always use proper TypeScript interfaces and types
- **Search for Solutions**: When encountering typing challenges, search online for TypeScript solutions

**Type Safety Best Practices**:

- Use explicit interface definitions for all data structures
- Prefer type unions and intersections over `any`/`unknown`
- Use proper type guards and type assertions when necessary
- Leverage TypeScript's built-in utility types (`Partial`, `Pick`, `Omit`, etc.)
- Enable strict type checking in tsconfig.json

**Common Patterns**:

```typescript
// ✅ GOOD: Explicit types
interface UserDto {
  id: string;
  name: string;
  email: string;
}

async function getUser(id: string): Promise<UserDto> {
  // implementation
}

// ❌ BAD: Using 'any'
async function getUser(id: string): Promise<any> {
  // NEVER do this
}
```

## File Organization

### Documentation Files

**IMPORTANT**: All generated Markdown documentation files (plans, specs, reports, etc.) must be placed under a date-based folder in `docs/`, using the format `docs/YYYY-MM-DD/`.

- Implementation plans and research docs: `docs/YYYY-MM-DD/plans/`
- Integrated API usage guides: `docs/YYYY-MM-DD/api-usage/`
- Integrated API configuration docs: `docs/YYYY-MM-DD/config/`
- Other generated docs: `docs/YYYY-MM-DD/`

**Filename Convention**: Use lowercase kebab-case for generated Markdown filenames (example: `skimlinks-integration-plan.md`).

Exception: Project root files like `README.md` and `CLAUDE.md` remain at the root level.

## Architecture

### NestJS Patterns

- **Modules**: Feature organization using `@Module()` decorators
- **Controllers**: HTTP request handling with `@Controller()` decorators
- **Services/Providers**: Business logic in injectable services with `@Injectable()`
- **Dependency Injection**: Constructor-based DI throughout the application
- **Main Entry**: [main.ts](src/main.ts) bootstraps the application on port 3000 (configurable via `PORT` env var)

### Project Structure

```
src/
  main.ts           # Application entry point, bootstraps NestFactory
  app.module.ts     # Root module that imports all feature modules
  app.controller.ts # Root controller
  app.service.ts    # Root service
  *.spec.ts         # Unit test files (co-located with source)
test/
  *.e2e-spec.ts     # End-to-end integration tests
  jest-e2e.json     # E2E test configuration
```

### Testing Structure

- **Unit Tests**: Co-located with source files as `*.spec.ts` in `src/`
- **E2E Tests**: Located in `test/` directory as `*.e2e-spec.ts`
- **Test Framework**: Jest with ts-jest transformer
- **E2E Pattern**: Use `@nestjs/testing` to create TestingModule, compile, and initialize NestApplication before tests

## Development Process

**CRITICAL**: This project follows STRICT Test-Driven Development (TDD). All development MUST follow the TDD cycle.

### TDD Workflow (MANDATORY)

**Golden Rule**: NEVER write implementation code before writing a failing test.

#### Red-Green-Refactor Cycle

Every feature MUST follow this exact sequence:

1. **RED - Write Failing Test**
   - Write ONE small test that fails
   - Test must be runnable, reproducible, and have clear assertions
   - Cover typical cases, edge cases, and error scenarios
   - Include all necessary imports, mocks, and test environment setup
   - **STOP and wait for user confirmation before proceeding**

2. **GREEN - Minimal Implementation**
   - Write ONLY enough code to make the test pass
   - No extra features, no future-proofing
   - Keep implementation as simple as possible
   - **STOP and wait for user to type "继续" before proceeding**

3. **REFACTOR - Clean Up**
   - Improve code quality WITHOUT changing behavior
   - All tests must still pass
   - Only proceed when user types "重构"
   - **STOP and wait for user confirmation before next test**

#### TDD Rules

**ABSOLUTELY FORBIDDEN**:

- Writing implementation before tests
- Writing multiple tests at once
- Implementing features not covered by tests
- Skipping any step in the Red-Green-Refactor cycle
- Proceeding to next step without user confirmation

**MANDATORY**:

- Every line of production code must be driven by a failing test
- Each iteration should be extremely small (one test, one implementation)
- Tests must cover: typical cases, edge cases, error cases
- Wait for explicit user confirmation between steps
- Run tests after each step to verify state (Red/Green)

#### Example TDD Interaction Flow

```text
Assistant: [Writes a failing test for feature X]
Assistant: "Test written (RED). Type '继续' when ready for implementation."
User: "继续"
Assistant: [Writes minimal implementation to pass test]
Assistant: "Implementation complete (GREEN). Type '重构' to refactor, or describe next test."
User: "重构"
Assistant: [Refactors code while keeping tests green]
Assistant: "Refactoring complete. Ready for next test."
```

### Planning Complex Features (TDD-Based)

For complex multi-step tasks, create an implementation plan in `docs/YYYY-MM-DD/plans/IMPLEMENTATION_PLAN.md`:

```markdown
## Stage N: [Name]

**Goal**: [Specific deliverable]
**Success Criteria**: [Testable outcomes]
**Tests**: [List specific test cases to write in TDD cycles]
**Status**: [Not Started|In Progress|Complete]
```

- Each stage should list individual test cases
- Follow TDD Red-Green-Refactor for each test case
- Update status as you progress through TDD cycles
- Remove file when all stages are done

### When Stuck (After 3 Attempts)

**CRITICAL**: Maximum 3 attempts per issue, then STOP.

1. **Document what failed**:
   - What you tried
   - Specific error messages
   - Why you think it failed

2. **Search Online (MANDATORY)**:
   - **DO NOT GUESS** - Use web search tools to find solutions
   - Search for specific error messages on Stack Overflow, GitHub issues
   - Look for official documentation and examples
   - Find 2-3 similar implementations in real projects
   - Note different approaches used by the community

3. **Question fundamentals**:
   - Is this the right abstraction level?
   - Can this be split into smaller problems?
   - Is there a simpler approach entirely?

4. **Try different angle**:
   - Different library/framework feature?
   - Different architectural pattern?
   - Remove abstraction instead of adding?

**Remember**: As an AI development assistant, always search online for solutions rather than making assumptions. Use available search tools to find proven solutions.

## Adding New Features (TDD Approach)

When creating new NestJS features, follow this STRICT TDD sequence:

1. **Start with Test Setup**:
   - Create test file FIRST (e.g., `user.service.spec.ts`)
   - Set up test module with mocks and dependencies
   - Do NOT create implementation file yet

2. **TDD Cycle for Each Feature**:
   - **RED**: Write one failing test for a specific behavior
   - **GREEN**: Create minimal implementation (create service/controller file if needed)
   - **REFACTOR**: Improve code while keeping tests green
   - Repeat for each piece of functionality

3. **NestJS CLI Usage** (After tests are written):

   ```bash
   # Only use CLI AFTER you have tests defining the behavior
   nest generate module <name>       # Creates module structure
   nest generate controller <name>   # Creates controller (will overwrite TDD code)
   nest generate service <name>      # Creates service (will overwrite TDD code)
   ```

   **WARNING**: CLI generates implementation code. Only use it for boilerplate AFTER you have tests.

4. **Follow NestJS Conventions**:
   - Use decorators (`@Module`, `@Controller`, `@Injectable`, `@Get`, `@Post`, etc.)
   - Implement dependency injection via constructor parameters
   - Keep business logic in services, routing in controllers
   - Import feature modules into AppModule

5. **Test Organization**:
   - Unit tests: Co-located with source files as `*.spec.ts`
   - Use `Test.createTestingModule()` for dependency injection in tests
   - E2E tests: Place in `test/` directory as `*.e2e-spec.ts`
   - E2E tests should also follow TDD (write test first, then make it pass)

## Technical Standards

### Architecture Principles

- **Composition over inheritance** - Use dependency injection
- **Interfaces over singletons** - Enable testing and flexibility
- **Explicit over implicit** - Clear data flow and dependencies
- **Test-Driven Development (TDD) is MANDATORY** - Every feature MUST follow Red-Green-Refactor cycle
- **Never disable tests** - If a test fails, fix the code or fix the test, never skip it

#### Code Reusability

**CRITICAL**: Always check for reusable code before implementing new functionality.

- **Before implementing**: Search the codebase for similar functionality that can be reused
- **Group related code**: Keep reusable utilities, helpers, and shared logic organized together
- **Common locations for reusable code**:
  - `src/common/` - Shared utilities, decorators, guards, filters, pipes
  - `src/shared/` - Shared modules, services, interfaces
  - `src/utils/` - Pure utility functions
- **Refactor for reuse**: If you write similar code twice, extract it into a reusable component

#### Modularity and Abstraction

**CRITICAL**: Design for flexibility and future changes.

- **Use abstraction interfaces** when integrating external services:
  - Databases: Define repository interfaces (e.g., `IUserRepository`) separate from implementation
  - Third-party APIs: Create service interfaces (e.g., `IPaymentService`) that can have multiple implementations
  - External services: Use abstract classes or interfaces for email, SMS, storage, etc.

- **Examples of good abstraction**:

  ```typescript
  // ✅ GOOD: Abstract interface for database operations
  interface IUserRepository {
    findById(id: string): Promise<User>;
    create(data: CreateUserDto): Promise<User>;
  }

  // Implementation can be MongoDB, PostgreSQL, etc.
  class MongoUserRepository implements IUserRepository {
    // MongoDB-specific implementation
  }

  // ✅ GOOD: Abstract interface for payment providers
  interface IPaymentService {
    processPayment(amount: number, token: string): Promise<PaymentResult>;
  }

  // Can have Stripe, PayPal, or other implementations
  class StripePaymentService implements IPaymentService {
    // Stripe-specific implementation
  }
  ```

- **Benefits**:
  - Easy to switch database providers (MongoDB → PostgreSQL)
  - Easy to switch API providers (Stripe → PayPal)
  - Easy to mock for testing
  - Follows Dependency Inversion Principle

- **When to abstract**:
  - Database access layers (repositories)
  - External API integrations (payment, email, SMS)
  - File storage (local, S3, etc.)
  - Authentication providers (JWT, OAuth, etc.)
  - Any service that might have multiple implementations

### Code Quality Requirements

#### Every Commit Must

- Have tests written BEFORE implementation code
- Compile successfully
- Pass ALL tests (100% pass rate required)
- Include tests for new functionality (written first via TDD)
- Follow project formatting/linting
- Follow TDD Red-Green-Refactor cycle

#### Before Committing

- Verify tests were written before implementation
- Run `pnpm run test` - all tests must pass
- Run formatters/linters
- Self-review changes
- Ensure commit message explains "why" and references test cases

### Error Handling

- Fail fast with descriptive messages
- Include context for debugging
- Handle errors at appropriate level
- Never silently swallow exceptions

## Decision Framework

When multiple valid approaches exist, choose based on:

1. **Testability** - Can I easily test this?
2. **Readability** - Will someone understand this in 6 months?
3. **Consistency** - Does this match project patterns?
4. **Simplicity** - Is this the simplest solution that works?
5. **Reversibility** - How hard to change later?

## Quality Gates

### Definition of Done

- [ ] Tests written and passing
- [ ] Code follows project conventions
- [ ] No linter/formatter warnings
- [ ] Commit messages are clear
- [ ] Implementation matches plan
- [ ] No TODOs without issue numbers

### Post-Development Checklist

After implementing any feature, always:

1. **Type Check**: Run `pnpm run build` to verify TypeScript compilation
2. **Lint**: Run `pnpm run lint` to check code quality
3. **Auto-fix**: Run `pnpm run lint --fix` to automatically resolve issues
4. **Format**: Run `pnpm run format` for consistent code style
5. **Test**: Run `pnpm run test` to ensure no regressions
6. **E2E Test**: Run `pnpm run test:e2e` for integration tests
7. **Documentation**: Review and update CLAUDE.md and date-based docs folders (`docs/YYYY-MM-DD/`) as needed (see Documentation Maintenance section)

### Critical Rules

**NEVER**:

- Write implementation code before writing a failing test (violates TDD)
- Write multiple tests at once without implementing each one
- Skip the Red-Green-Refactor cycle
- Proceed to next step without user confirmation (when doing TDD)
- Use `--no-verify` to bypass commit hooks
- Disable tests instead of fixing them
- Commit code that doesn't compile
- Commit code with failing tests
- Make assumptions - verify with existing code
- Use `any` or `unknown` types in production code - these keywords are STRICTLY FORBIDDEN
- Commit code containing `any` or `unknown` types

**ALWAYS**:

- Follow TDD Red-Green-Refactor cycle for ALL features
- Write tests FIRST, implementation SECOND
- Wait for user confirmation between TDD steps ("继续" or "重构")
- Ensure tests cover typical cases, edge cases, and error scenarios
- Run tests after each change to verify Red/Green state
- Commit working code incrementally (with passing tests)
- Update plan documentation as you go
- Learn from existing implementations
- Stop after 3 failed attempts and reassess
- Use proper TypeScript types and interfaces instead of `any` or `unknown`
- Search online for TypeScript solutions when encountering typing challenges
- **Check for reusable code** before implementing new functionality
- **Search online** when encountering problems - DO NOT GUESS
- **Update documentation** after significant changes (see Documentation Maintenance below)

## Documentation Maintenance

**CRITICAL**: Keep documentation up-to-date with code changes.

### When to Update Documentation

After ANY significant change, check if documentation needs updates:

- **CLAUDE.md** (this file):
  - New development patterns or practices
  - Changes to project structure or conventions
  - New tools or dependencies added
  - Updates to testing strategy
  - Changes to build/deployment process

- **docs/YYYY-MM-DD/plans/IMPLEMENTATION_PLAN.md**:
  - Update status as features are completed
  - Add new stages if scope changes
  - Document completed test cases
  - Remove file when all stages are done

- **docs/YYYY-MM-DD/** directory:
  - API changes: Update API documentation
  - Architecture changes: Update architecture diagrams/docs
  - New modules: Document module responsibilities
  - Configuration changes: Update setup guides

- **docs/YYYY-MM-DD/api-usage/** and **docs/YYYY-MM-DD/config/**:
  - Keep API usage instructions and API configuration documents separated by folder
  - Do not mix usage docs and config docs in the same folder

- **README.md**:
  - Installation steps changed
  - New prerequisites added
  - Environment variables added/changed
  - Running instructions modified

### Documentation Update Checklist

After completing a feature or making significant changes:

1. [ ] Review CLAUDE.md - Does it need updates for new patterns?
2. [ ] Review docs/YYYY-MM-DD/ files - Do they reflect current architecture?
3. [ ] Update docs/YYYY-MM-DD/plans/IMPLEMENTATION_PLAN.md - Mark stages complete, update status
4. [ ] Check README.md - Are setup instructions still accurate?
5. [ ] Update API documentation if endpoints changed
6. [ ] Document new abstractions/interfaces created
7. [ ] Update test documentation if test patterns changed

**Remember**: Out-of-date documentation is worse than no documentation. Always keep docs synchronized with code.

## Common Gotchas

- **Module Resolution**: Using `nodenext` means you may need `.js` extensions in imports even for `.ts` files
- **Decorators**: Must have `experimentalDecorators` and `emitDecoratorMetadata` enabled
- **Async Bootstrap**: The main function uses async/await pattern for app initialization
- **Type Safety**: While `noImplicitAny` is off, prefer explicit types for better code quality
