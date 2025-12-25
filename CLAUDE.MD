# Claude Project Guidelines

## Technology Stack

This project uses **Tailwind CSS v4** for styling.

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