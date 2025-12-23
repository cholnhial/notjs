# Claude Project Guidelines

## Git Commits

When making changes with Claude Code, always create a commit with a meaningful message that clearly describes what was changed and why.

**Commit Message Guidelines:**

- Use imperative mood (e.g., "Add feature" not "Added feature")
- Start with a verb (Add, Fix, Update, Refactor, Remove, etc.)
- Be specific about what changed
- Keep the first line under 72 characters
- Add additional context in the body if needed
- **Do NOT** include any reference that code was generated with Claude Code or AI

**Examples of good commit messages:**

```
Add pixelated font to NotJS title elements

- Replace inline styles with Tailwind CSS variable syntax
- Use Press Start 2P font from Google Fonts
- Apply to main title, CODE header, and CONSOLE header
```

```
Fix C++ compilation by adding version support

- Add CppExecutor implementing NotJSExecutor interface
- Support C++ standards 98, 11, 14, 17, 20, 23
- Generate random file names to prevent conflicts
```

```
Refactor Java execution to use strategy pattern

- Create NotJSExecutor interface for language executors
- Implement LanguageExecutorFactory for executor selection
- Update WebSocketHandler to accept ExecutionRequest JSON
```

**When to commit:**

- After completing a logical unit of work (feature, bugfix, refactor)
- Before switching to a different task
- When specifically requested by the user

## Code Comments

Add comments for complex behavior to aid future understanding, but use sparingly. Only comment when:

- The logic is non-obvious or has subtle edge cases
- There's a specific reason for an implementation choice that isn't clear from the code
- Complex algorithms or business logic that require explanation
- Workarounds for known issues or limitations

**Do NOT comment:**
- Self-explanatory code
- Simple variable assignments or return statements
- Standard patterns and conventions

**Example of when to comment:**
```java
// Using \b \b pattern: backspace moves cursor left, space clears character,
// backspace repositions cursor - standard terminal control sequence
term.write('\b \b');
```

**Example of when NOT to comment:**
```java
// Get the user name (unnecessary - code is self-explanatory)
String userName = request.getParameter("name");
```