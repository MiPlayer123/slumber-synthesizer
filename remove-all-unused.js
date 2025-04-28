import fs from "fs";
import { execSync } from "child_process";

// Get ESLint output
console.log("Running ESLint to find all unused variables...");
const eslintOutput = execSync("npx eslint . --format json", {
  encoding: "utf8",
});
const results = JSON.parse(eslintOutput);

// Store unused variables by file
const fileIssues = {};

// Group warnings by file
results.forEach((result) => {
  const filePath = result.filePath;
  const unusedVars = result.messages.filter(
    (msg) => msg.ruleId === "@typescript-eslint/no-unused-vars",
  );

  if (unusedVars.length > 0) {
    if (!fileIssues[filePath]) {
      fileIssues[filePath] = [];
    }

    unusedVars.forEach((issue) => {
      fileIssues[filePath].push({
        line: issue.line,
        column: issue.column,
        name: issue.message.match(/'([^']+)'/)[1],
        message: issue.message,
      });
    });
  }
});

// Process each file with issues
console.log(
  `Found ${Object.keys(fileIssues).length} files with unused variables`,
);

for (const [filePath, issues] of Object.entries(fileIssues)) {
  try {
    console.log(`\nProcessing ${filePath} (${issues.length} issues):`);

    // Read file content
    const content = fs.readFileSync(filePath, "utf8");
    const lines = content.split("\n");

    // Track line modifications to avoid duplicate modifications
    const modifiedLines = new Set();

    // Group issues by line
    const issuesByLine = {};
    issues.forEach((issue) => {
      if (!issuesByLine[issue.line]) {
        issuesByLine[issue.line] = [];
      }
      issuesByLine[issue.line].push(issue);

      // Log the issue
      console.log(
        `  - Line ${issue.line}: '${issue.name}' ${issue.message.split("'")[2]}`,
      );
    });

    // Process each line with issues
    for (const [lineNum, lineIssues] of Object.entries(issuesByLine)) {
      const lineNumber = parseInt(lineNum);

      // Skip already modified lines
      if (modifiedLines.has(lineNumber)) continue;

      const originalLine = lines[lineNumber - 1];
      const unusedVars = lineIssues.map((issue) => issue.name);

      // Check if this is an import line
      if (originalLine.trim().startsWith("import ")) {
        // Named imports: import { A, B, C } from 'module'
        if (originalLine.includes("{") && originalLine.includes("}")) {
          const importMatch = originalLine.match(
            /import\s+\{\s*(.*?)\s*\}\s+from/,
          );
          if (importMatch) {
            const importList = importMatch[1];
            const imports = importList.split(",").map((i) => i.trim());

            // Filter out unused imports
            const filteredImports = imports.filter((imp) => {
              // Handle "Name as Alias" format
              const name = imp.split(" as ")[0].trim();
              return !unusedVars.includes(name);
            });

            if (filteredImports.length === 0) {
              // If all imports were removed, remove the entire line
              lines[lineNumber - 1] = "";
              console.log(`    Removed entire import: ${originalLine.trim()}`);
            } else {
              // Replace with filtered imports
              lines[lineNumber - 1] = originalLine.replace(
                /\{\s*(.*?)\s*\}/,
                `{ ${filteredImports.join(", ")} }`,
              );
              console.log(
                `    Modified import: ${lines[lineNumber - 1].trim()}`,
              );
            }

            modifiedLines.add(lineNumber);
          }
        }
        // Default import: import A from 'module'
        else if (
          unusedVars.some((v) =>
            originalLine.match(new RegExp(`import\\s+${v}\\s+from`)),
          )
        ) {
          lines[lineNumber - 1] = "";
          console.log(`    Removed default import: ${originalLine.trim()}`);
          modifiedLines.add(lineNumber);
        }
        // Side effect import with alias: import * as A from 'module'
        else if (
          unusedVars.some((v) =>
            originalLine.match(
              new RegExp(`import\\s+\\*\\s+as\\s+${v}\\s+from`),
            ),
          )
        ) {
          lines[lineNumber - 1] = "";
          console.log(`    Removed namespace import: ${originalLine.trim()}`);
          modifiedLines.add(lineNumber);
        }
        continue;
      }

      // Simple variable declarations: const varName = value or let varName = value
      const varDeclMatch = originalLine.match(
        /(const|let|var)\s+([a-zA-Z0-9_]+)\s*=/,
      );
      if (
        varDeclMatch &&
        !originalLine.includes("{") &&
        !originalLine.includes("[")
      ) {
        const varType = varDeclMatch[1]; // const, let, or var
        const varName = varDeclMatch[2].trim();

        if (unusedVars.includes(varName)) {
          // Check if this is a standalone declaration or part of multiple declarations
          if (originalLine.includes(",")) {
            // Handle multiple declarations on one line: const a = 1, b = 2
            // We need to be careful here to preserve other variables
            const varSection = new RegExp(
              `(^|,)\\s*${varName}\\s*=\\s*[^,;]*(,|;|$)`,
            );
            const newLine = originalLine.replace(
              varSection,
              (match, prefix, suffix) => {
                // If this is the only declaration or the last one, keep the suffix
                if (prefix === "" && suffix === ";") return "";
                // If this is the first of multiple, keep the comma for the next variable
                if (prefix === "" && suffix === ",") return "";
                // If this is in the middle or end, keep the prefix without the variable
                return prefix;
              },
            );

            if (newLine.trim() === `${varType}`) {
              // If only the variable type is left, remove the entire line
              lines[lineNumber - 1] = "";
            } else {
              lines[lineNumber - 1] = newLine;
            }
          } else {
            // Single variable declaration, remove the entire line
            lines[lineNumber - 1] = "";
          }
          console.log(
            `    Removed variable declaration: ${originalLine.trim()}`,
          );
          modifiedLines.add(lineNumber);
          continue;
        }
      }

      // Destructuring assignment: const { a, b, c } = obj or let { a, b, c } = obj
      if (
        originalLine.includes("{") &&
        originalLine.includes("}") &&
        (originalLine.includes("const") ||
          originalLine.includes("let") ||
          originalLine.includes("var"))
      ) {
        const destructureMatch = originalLine.match(
          /(?:const|let|var)\s+\{\s*(.*?)\s*\}\s*=/,
        );
        if (destructureMatch) {
          const varList = destructureMatch[1];
          const vars = varList.split(",").map((v) => v.trim());

          // Filter out unused vars
          const filteredVars = vars.filter((v) => {
            // Handle "name: alias" format
            const name = v.includes(":") ? v.split(":")[0].trim() : v;
            return !unusedVars.includes(name);
          });

          if (filteredVars.length === 0) {
            // If all vars were removed, remove the entire line
            lines[lineNumber - 1] = "";
            console.log(
              `    Removed entire destructure: ${originalLine.trim()}`,
            );
          } else {
            // Replace with filtered vars
            lines[lineNumber - 1] = originalLine.replace(
              /\{\s*(.*?)\s*\}/,
              `{ ${filteredVars.join(", ")} }`,
            );
            console.log(
              `    Modified destructure: ${lines[lineNumber - 1].trim()}`,
            );
          }

          modifiedLines.add(lineNumber);
          continue;
        }
      }

      // Function parameters: function name(a, b, c) or (a, b) => {}
      const functionParamMatch = originalLine.match(/(\([^)]*\))/);
      if (functionParamMatch) {
        const params = functionParamMatch[1]; // includes the parentheses
        const paramList = params.slice(1, -1); // removes the parentheses

        if (paramList.trim()) {
          const paramItems = paramList.split(",").map((p) => p.trim());
          let modified = false;
          let newParams = "(";

          // Rebuild the parameter list without unused parameters
          for (let i = 0; i < paramItems.length; i++) {
            const paramName = paramItems[i].replace(/:.+$/, "").trim(); // Remove type annotation

            if (!unusedVars.includes(paramName)) {
              if (newParams !== "(") newParams += ", ";
              newParams += paramItems[i];
            } else {
              modified = true;
              console.log(`    Removing parameter '${paramName}'`);
            }
          }
          newParams += ")";

          if (modified) {
            lines[lineNumber - 1] = originalLine.replace(params, newParams);
            console.log(
              `    Modified function parameters: ${lines[lineNumber - 1].trim()}`,
            );
            modifiedLines.add(lineNumber);
            continue;
          }
        }
      }

      // Array destructuring: const [a, b, c] = arr or let [a, b, c] = arr
      if (
        originalLine.includes("[") &&
        originalLine.includes("]") &&
        (originalLine.includes("const") ||
          originalLine.includes("let") ||
          originalLine.includes("var"))
      ) {
        const arrayDestructMatch = originalLine.match(
          /(?:const|let|var)\s+\[\s*(.*?)\s*\]\s*=/,
        );
        if (arrayDestructMatch) {
          const varList = arrayDestructMatch[1];
          const vars = varList.split(",").map((v) => v.trim());
          let modified = false;
          let newVarList = [];

          // For each item in the destructuring array
          for (let i = 0; i < vars.length; i++) {
            const varName = vars[i];
            if (unusedVars.includes(varName)) {
              newVarList.push(""); // Replace with empty slot
              modified = true;
            } else {
              newVarList.push(varName);
            }
          }

          // Remove trailing empty slots
          while (
            newVarList.length > 0 &&
            newVarList[newVarList.length - 1] === ""
          ) {
            newVarList.pop();
            modified = true;
          }

          if (modified) {
            if (newVarList.length === 0) {
              // All variables removed, remove the entire line
              lines[lineNumber - 1] = "";
              console.log(
                `    Removed entire array destructure: ${originalLine.trim()}`,
              );
            } else {
              // Replace with filtered array items
              lines[lineNumber - 1] = originalLine.replace(
                /\[\s*(.*?)\s*\]/,
                `[ ${newVarList.join(", ")} ]`,
              );
              console.log(
                `    Modified array destructure: ${lines[lineNumber - 1].trim()}`,
              );
            }
            modifiedLines.add(lineNumber);
            continue;
          }
        }
      }

      // If we've reached here, suggest manual fix
      if (unusedVars.length > 0) {
        console.log(
          `    Could not automatically remove: '${unusedVars.join(", ")}' - manual removal needed`,
        );
      }
    }

    // Clean up empty lines (but don't collapse more than 2 empty lines)
    const newContent = lines.join("\n").replace(/\n{3,}/g, "\n\n");

    // Write changes back to file if modified
    if ([...modifiedLines].length > 0) {
      fs.writeFileSync(filePath, newContent);
      console.log(`✓ Updated file with ${modifiedLines.size} modifications`);
    } else {
      console.log(
        `✗ No modifications made (complex patterns not handled automatically)`,
      );
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error);
  }
}

console.log(
  "\nRemoval process complete! Run ESLint again to check remaining issues.",
);
console.log("Some variables in complex patterns may require manual removal.");
