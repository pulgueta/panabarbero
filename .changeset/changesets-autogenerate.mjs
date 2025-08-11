/** biome-ignore-all lint/style/useNodejsImportProtocol: Not needed */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const config = {
  versionedScopes: ['app', 'api'],
  packagePrefix: '@panabarbero/',
  changesetDir: '.changeset',  
  versioningTypes: {
    major: ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'build', 'ci'],
    minor: ['feat'],
    patch: ['fix', 'docs', 'style', 'refactor', 'perf', 'test', 'chore', 'build', 'ci']
  },
  nonVersioningScopes: ['ci', 'build', 'test', 'docs', 'readme', 'github', 'utils', 'tools', 'scripts'],
  commitPatterns: {
    major: [
      /^(?:feat|fix|docs|style|refactor|perf|test|chore|build|ci)!(?:\(([^)]+)\))?: (.+)/,
      /^BREAKING CHANGE(?:\(([^)]+)\))?: (.+)/,
      /^(?:feat|fix|docs|style|refactor|perf|test|chore|build|ci)(?:\(([^)]+)\))?: (.+)\n\nBREAKING CHANGE: (.+)/s
    ],
    minor: /^feat(?:\(([^)]+)\))?: (.+)/,
    patch: /^(?:fix|docs|style|refactor|perf|test|chore|build|ci)(?:\(([^)]+)\))?: (.+)/,
  }
};

function getCommitMessage() {
  try {
    return execSync('git log -1 --format=%s', { encoding: 'utf8' }).trim();
  } catch (error) {
    throw new Error('Failed to get commit message. Are you in a git repository with commits?');
  }
}

function getCommitHash() {
  try {
    return execSync('git log -1 --format=%H', { encoding: 'utf8' }).trim().substring(0, 8);
  } catch (error) {
    throw new Error('Failed to get commit hash.');
  }
}

function shouldCreateVersioning(type, scope) {
  if (scope && config.nonVersioningScopes.includes(scope)) {
    return { shouldVersion: false, reason: `Scope "${scope}" is marked as non-versioning` };
  }
  
  if (scope && config.versionedScopes.includes(scope)) {
    return { shouldVersion: true, targetScopes: [scope] };
  }
  
  if (!scope) {
    if (type === 'major') {
      return { shouldVersion: true, targetScopes: config.versionedScopes };
    }
    
    return { shouldVersion: true, targetScopes: config.versionedScopes };
  }
  
  return { shouldVersion: false, reason: `Scope "${scope}" is not a versioned package` };
}

function parseCommitMessage(commitMessage) {
  const { commitPatterns } = config;
  
  for (const pattern of commitPatterns.major) {
    const majorMatch = commitMessage.match(pattern);
    if (majorMatch) {
      if (pattern.source.includes('BREAKING CHANGE:')) {
        return {
          type: 'major',
          scope: majorMatch[2] || null,
          description: majorMatch[4] || majorMatch[3] || majorMatch[1]
        };
      } else {
        return {
          type: 'major',
          scope: majorMatch[1] || null,
          description: majorMatch[2]
        };
      }
    }
  }

  const minorMatch = commitMessage.match(commitPatterns.minor);
  if (minorMatch) {
    return {
      type: 'minor',
      scope: minorMatch[1] || null,
      description: minorMatch[2]
    };
  }

  const patchMatch = commitMessage.match(commitPatterns.patch);

  if (patchMatch) {
    return {
      type: 'patch',
      scope: patchMatch[1] || null,
      description: patchMatch[2]
    };
  }

  return null;
}

function createChangesetContent(packageName, changeType, description) {
  return `---
'${config.packagePrefix}${packageName}': ${changeType}
---

${description}
`;
}

function ensureChangesetDirectory() {
  if (!fs.existsSync(config.changesetDir)) {
    fs.mkdirSync(config.changesetDir, { recursive: true });
  }
}

function changesetExists(commitHash) {
  const changesetFiles = fs.readdirSync(config.changesetDir)
    .filter(file => file.endsWith('.md') && file.includes(commitHash));
  
    return changesetFiles.length > 0;
}

function writeChangeset(packageName, changeType, description, commitHash) {
  ensureChangesetDirectory();
  
  if (changesetExists(commitHash)) {
    console.log(`⚠️ Changeset already exists for commit ${commitHash}`);
    
    return false;
  }

  const filename = `auto-${commitHash}-${Date.now()}.md`;
  const filepath = path.join(config.changesetDir, filename);
  const content = createChangesetContent(packageName, changeType, description);
  
  try {
    fs.writeFileSync(filepath, content);
    
    return true;
  } catch (error) {
    throw new Error(`Failed to write changeset file: ${error.message}`);
  }
}

function main() {
  try {
    const commitMessage = getCommitMessage();
    const commitHash = getCommitHash();
    
    console.log(`📝 Processing commit: ${commitMessage}`);
    
    const parsed = parseCommitMessage(commitMessage);
    
    if (!parsed) {
      console.log('ℹ️ Commit does not match any versioning patterns. No changeset created.');
    
      return;
    }

    const { type: changeType, scope, description } = parsed;
    
    const versioningDecision = shouldCreateVersioning(changeType, scope);
    
    if (!versioningDecision.shouldVersion) {
      console.log(`ℹ️ ${versioningDecision.reason}. No changeset created.`);
      return;
    }

    let createdCount = 0;

    for (const targetScope of versioningDecision.targetScopes) {
      const success = writeChangeset(targetScope, changeType, description, commitHash);
    
      if (success) {
        console.log(`✅ ${changeType} changeset created for package: ${config.packagePrefix}${targetScope}`);
        createdCount++;
      }
    }
    
    if (createdCount === 0) {
      console.log('⚠️ No changesets were created.');
    } else if (versioningDecision.targetScopes.length > 1) {
      console.log(`📦 Created ${createdCount} changesets for ${changeType} change${scope ? ` in scope: ${scope}` : ''}`);
    }

  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

main();