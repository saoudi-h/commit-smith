module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      [
        'feat',     // New feature
        'fix',      // Bug fix
        'docs',     // Documentation changes
        'style',    // Code style changes
        'refactor', // Code refactoring
        'perf',     // Performance improvements
        'test',     // Test additions/fixes
        'chore',    // Maintenance tasks
        'ci',       // CI/CD configuration
        'build',    // Build system changes
        'revert',   // Commit revert
        'wip'       // Work in progress
      ],
    ],
    'type-case': [2, 'always', 'lower-case'],
    'type-empty': [2, 'never'],
    'scope-case': [2, 'always', 'lower-case'],
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    'body-leading-blank': [1, 'always'],
    'body-max-line-length': [2, 'always', 100],
    'footer-leading-blank': [1, 'always'],
    'footer-max-line-length': [2, 'always', 100],
  },
  prompt: {
    questions: {
      type: {
        description: 'Select the type of change:',
        enum: {
          feat: {
            description: 'New feature',
            title: 'Features',
            emoji: '✨',
          },
          fix: {
            description: 'Bug fix',
            title: 'Bug Fixes',
            emoji: '🐛',
          },
          docs: {
            description: 'Documentation',
            title: 'Documentation',
            emoji: '📚',
          },
          style: {
            description: 'Code style changes',
            title: 'Styles',
            emoji: '💎',
          },
          refactor: {
            description: 'Code refactoring',
            title: 'Code Refactoring',
            emoji: '📦',
          },
          perf: {
            description: 'Performance improvements',
            title: 'Performance Improvements',
            emoji: '🚀',
          },
          test: {
            description: 'Test additions/fixes',
            title: 'Tests',
            emoji: '🚨',
          },
          build: {
            description: 'Build system changes',
            title: 'Builds',
            emoji: '🛠',
          },
          ci: {
            description: 'CI/CD configuration',
            title: 'Continuous Integrations',
            emoji: '⚙️',
          },
          chore: {
            description: 'Maintenance tasks',
            title: 'Chores',
            emoji: '♻️',
          },
          revert: {
            description: 'Commit revert',
            title: 'Reverts',
            emoji: '🗑',
          },
        },
      },
      scope: {
        description: 'What is the scope of this change? (e.g., component, utils, docs)',
      },
      subject: {
        description: 'Write a brief description:',
      },
      body: {
        description: 'Provide a more detailed description:',
      },
      isBreaking: {
        description: 'Is this a breaking change?',
      },
      breakingBody: {
        description: 'Add detailed description for the breaking change:',
      },
      breaking: {
        description: 'Describe the breaking change:',
      },
      isIssueAffected: {
        description: 'Does this change affect open issues?',
      },
      issuesBody: {
        description: 'If issues are affected, describe them:',
      },
      issues: {
        description: 'Add issue references (e.g., "fix #123", "re #123"):',
      },
    },
  },
};
