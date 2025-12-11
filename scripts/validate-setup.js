/**
 * Setup Validation Script
 * Run this after npm install to verify your environment is configured correctly
 * 
 * Usage: node scripts/validate-setup.js
 */

const fs = require('fs');
const path = require('path');

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkmark() {
  return `${colors.green}✓${colors.reset}`;
}

function crossmark() {
  return `${colors.red}✗${colors.reset}`;
}

function warning() {
  return `${colors.yellow}⚠${colors.reset}`;
}

// Validation checks
const checks = {
  nodeVersion: () => {
    const version = process.version;
    const major = parseInt(version.slice(1).split('.')[0]);
    if (major >= 18) {
      log(`${checkmark()} Node.js version: ${version}`, 'green');
      return true;
    } else {
      log(`${crossmark()} Node.js version: ${version} (requires 18+)`, 'red');
      return false;
    }
  },

  envFile: () => {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      log(`${checkmark()} .env file exists`, 'green');
      return true;
    } else {
      log(`${crossmark()} .env file not found`, 'red');
      log(`   Run: copy .env.example .env`, 'yellow');
      return false;
    }
  },

  envVariables: () => {
    try {
      require('dotenv').config();
    } catch (e) {
      // dotenv not installed yet
      return null;
    }

    const required = [
      'DATABASE_URL',
      'NEON_DB_URL',
      'ELEVEN_API_KEY',
      'GEMINI_API_KEY',
      'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
      'CLERK_SECRET_KEY',
      'WEBHOOK_SECRET',
      'JWT_SECRET',
    ];

    let allPresent = true;
    let count = 0;

    required.forEach((key) => {
      if (process.env[key]) {
        count++;
      } else {
        if (allPresent) {
          log(`${crossmark()} Missing environment variables:`, 'red');
          allPresent = false;
        }
        log(`   - ${key}`, 'yellow');
      }
    });

    if (allPresent) {
      log(`${checkmark()} All ${required.length} required environment variables set`, 'green');
      return true;
    } else {
      log(`${warning()} ${count}/${required.length} variables configured`, 'yellow');
      return false;
    }
  },

  prismaSchema: () => {
    const schemaPath = path.join(process.cwd(), 'prisma', 'schema.prisma');
    if (fs.existsSync(schemaPath)) {
      log(`${checkmark()} Prisma schema exists`, 'green');
      return true;
    } else {
      log(`${crossmark()} Prisma schema not found`, 'red');
      return false;
    }
  },

  nodeModules: () => {
    const nmPath = path.join(process.cwd(), 'node_modules');
    if (fs.existsSync(nmPath)) {
      log(`${checkmark()} node_modules installed`, 'green');
      return true;
    } else {
      log(`${crossmark()} node_modules not found`, 'red');
      log(`   Run: npm install`, 'yellow');
      return false;
    }
  },

  prismaClient: () => {
    const clientPath = path.join(process.cwd(), 'node_modules', '.prisma', 'client');
    if (fs.existsSync(clientPath)) {
      log(`${checkmark()} Prisma client generated`, 'green');
      return true;
    } else {
      log(`${crossmark()} Prisma client not generated`, 'red');
      log(`   Run: npm run prisma:generate`, 'yellow');
      return false;
    }
  },

  srcDirectory: () => {
    const srcPath = path.join(process.cwd(), 'src');
    if (fs.existsSync(srcPath)) {
      const files = ['app', 'lib', 'types', 'middleware.ts'];
      const present = files.filter(f => fs.existsSync(path.join(srcPath, f)));
      
      if (present.length === files.length) {
        log(`${checkmark()} Source directory structure complete`, 'green');
        return true;
      } else {
        log(`${warning()} Source directory incomplete (${present.length}/${files.length})`, 'yellow');
        return false;
      }
    } else {
      log(`${crossmark()} src directory not found`, 'red');
      return false;
    }
  },

  apiRoutes: () => {
    const apiPath = path.join(process.cwd(), 'src', 'app', 'api');
    if (fs.existsSync(apiPath)) {
      const routes = ['session', 'token', 'webhook'];
      const present = routes.filter(r => fs.existsSync(path.join(apiPath, r)));
      
      if (present.length === routes.length) {
        log(`${checkmark()} API routes complete`, 'green');
        return true;
      } else {
        log(`${warning()} API routes incomplete (${present.length}/${routes.length})`, 'yellow');
        return false;
      }
    } else {
      log(`${crossmark()} API directory not found`, 'red');
      return false;
    }
  },

  configFiles: () => {
    const configs = [
      'package.json',
      'tsconfig.json',
      'next.config.js',
      'tailwind.config.js',
      '.gitignore'
    ];

    const present = configs.filter(f => fs.existsSync(path.join(process.cwd(), f)));
    
    if (present.length === configs.length) {
      log(`${checkmark()} Configuration files complete`, 'green');
      return true;
    } else {
      log(`${warning()} Configuration files incomplete (${present.length}/${configs.length})`, 'yellow');
      return false;
    }
  },
};

// Run validation
async function validate() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║         AIVIA Version 2 - Setup Validation                ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝\n', 'cyan');

  const results = {};

  // Run all checks
  log('Running validation checks...\n', 'blue');

  results.nodeVersion = checks.nodeVersion();
  results.configFiles = checks.configFiles();
  results.srcDirectory = checks.srcDirectory();
  results.apiRoutes = checks.apiRoutes();
  results.nodeModules = checks.nodeModules();
  results.prismaSchema = checks.prismaSchema();
  results.prismaClient = checks.prismaClient();
  results.envFile = checks.envFile();
  results.envVariables = checks.envVariables();

  // Calculate score
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(Boolean).length;
  const percentage = Math.round((passed / total) * 100);

  // Summary
  log('\n' + '═'.repeat(60), 'cyan');
  log(`\nValidation Score: ${passed}/${total} checks passed (${percentage}%)`, 'blue');

  if (percentage === 100) {
    log('\n🎉 Perfect! Your setup is complete and ready to go!', 'green');
    log('\nNext steps:', 'cyan');
    log('  1. Run: npm run dev', 'white');
    log('  2. Open: http://localhost:3000', 'white');
    log('  3. Sign up and start testing!\n', 'white');
  } else if (percentage >= 80) {
    log('\n✅ Good! Your setup is mostly complete.', 'green');
    log('Address the warnings above and you\'ll be ready.', 'yellow');
  } else if (percentage >= 50) {
    log('\n⚠️  Getting there! A few more steps needed.', 'yellow');
    log('Follow the suggestions above to complete setup.', 'yellow');
  } else {
    log('\n❌ Setup incomplete. Please address the issues above.', 'red');
    log('\nQuick start guide: See QUICKSTART.md', 'yellow');
  }

  log('\n' + '═'.repeat(60) + '\n', 'cyan');

  process.exit(percentage === 100 ? 0 : 1);
}

// Run
validate().catch(console.error);
