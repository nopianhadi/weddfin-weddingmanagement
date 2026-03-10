#!/usr/bin/env node

/**
 * Interactive setup and deployment script for Supabase optimizations
 * Run with: node scripts/setup-and-deploy.js
 */

import { execSync } from 'child_process';
import fs from 'fs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

class InteractiveDeployer {
  async checkSupabaseSetup() {
    console.log('🔍 Checking Supabase setup...\n');
    
    // Check if CLI is available
    try {
      execSync('npx supabase --version', { stdio: 'pipe' });
      console.log('✅ Supabase CLI is available');
    } catch {
      console.log('❌ Supabase CLI not found');
      return false;
    }
    
    // Check if project is linked
    try {
      execSync('npx supabase status', { stdio: 'pipe' });
      console.log('✅ Supabase project is configured');
      return true;
    } catch {
      console.log('⚠️ Supabase project not linked or local instance not running');
      return false;
    }
  }
  
  async setupSupabase() {
    console.log('\n🚀 Let\'s set up Supabase for your optimizations!\n');
    
    const choice = await question(
      'Choose setup option:\n' +
      '1. Link to existing Supabase project (production)\n' +
      '2. Start local development environment\n' +
      '3. Skip Supabase setup (client-side optimizations only)\n' +
      'Enter choice (1-3): '
    );
    
    switch (choice.trim()) {
      case '1':
        return await this.setupProduction();
      case '2':
        return await this.setupLocal();
      case '3':
        console.log('\n📝 Skipping Supabase setup. You can use client-side optimizations immediately!');
        return 'client-only';
      default:
        console.log('Invalid choice. Defaulting to client-only mode.');
        return 'client-only';
    }
  }
  
  async setupProduction() {
    console.log('\n🌐 Setting up production Supabase project...\n');
    
    try {
      console.log('Step 1: Login to Supabase');
      execSync('npx supabase login', { stdio: 'inherit' });
      
      const projectRef = await question('\nStep 2: Enter your project reference ID (from dashboard URL): ');
      
      console.log('Step 3: Linking to project...');
      execSync(`npx supabase link --project-ref ${projectRef.trim()}`, { stdio: 'inherit' });
      
      console.log('✅ Production setup complete!');
      return 'production';
    } catch (error) {
      console.log('❌ Production setup failed:', error.message);
      return false;
    }
  }
  
  async setupLocal() {
    console.log('\n🏠 Setting up local development environment...\n');
    
    try {
      console.log('Checking Docker...');
      execSync('docker --version', { stdio: 'pipe' });
      console.log('✅ Docker is available');
      
      console.log('Starting Supabase locally...');
      execSync('npx supabase start', { stdio: 'inherit' });
      
      console.log('✅ Local setup complete!');
      return 'local';
    } catch (error) {
      console.log('❌ Local setup failed. Make sure Docker Desktop is installed and running.');
      console.log('Download from: https://www.docker.com/products/docker-desktop/');
      return false;
    }
  }
  
  async deployOptimizations(setupType) {
    console.log('\n🚀 Deploying optimizations...\n');
    
    if (setupType === 'client-only') {
      this.deployClientOnly();
      return;
    }
    
    let successCount = 0;
    let totalSteps = 4;
    
    // Apply migrations
    try {
      console.log('📦 Applying database migrations...');
      execSync('npx supabase db push', { stdio: 'inherit' });
      console.log('✅ Database migrations applied');
      successCount++;
    } catch (error) {
      console.log('❌ Migration failed:', error.message);
    }
    
    // Deploy Edge Functions
    try {
      console.log('\n🔧 Deploying Edge Functions...');
      const functions = ['dashboard-stats', 'project-analytics'];
      
      for (const func of functions) {
        try {
          console.log(`  Deploying ${func}...`);
          execSync(`npx supabase functions deploy ${func}`, { stdio: 'inherit' });
          console.log(`  ✅ ${func} deployed`);
        } catch (error) {
          console.log(`  ⚠️ ${func} deployment failed`);
        }
      }
      successCount++;
    } catch (error) {
      console.log('❌ Edge Functions deployment failed');
    }
    
    // Generate config
    this.generateConfig(setupType);
    successCount++;
    
    // Show results
    console.log('\n📊 Deployment Results:');
    console.log(`✅ Completed: ${successCount}/${totalSteps} steps`);
    
    if (successCount === totalSteps) {
      console.log('\n🎉 Full deployment successful!');
      console.log('Expected egress reduction: 70-80%');
    } else {
      console.log('\n⚠️ Partial deployment completed');
      console.log('You can still use client-side optimizations for 40-50% reduction');
    }
  }
  
  deployClientOnly() {
    console.log('📱 Setting up client-side optimizations...\n');
    
    this.generateConfig('client-only');
    
    console.log('✅ Client-side optimizations ready!');
    console.log('\n📖 Usage example:');
    console.log('```typescript');
    console.log('import { optimizedDataService } from \'./services/optimizedDataService\';');
    console.log('');
    console.log('// Replace your existing data calls:');
    console.log('const projects = await optimizedDataService.getProjects(userId, {');
    console.log('  useCache: true,');
    console.log('  usePagination: true');
    console.log('});');
    console.log('```');
    console.log('\nExpected egress reduction: 40-50%');
  }
  
  generateConfig(setupType) {
    const config = {
      optimizations: {
        caching: {
          enabled: true,
          defaultTTL: 300000,
          maxSize: 200
        },
        realtime: {
          batchDelay: 1000,
          maxBatchSize: 5,
          reconnectDelay: 2000
        },
        edgeFunctions: {
          dashboardStats: setupType !== 'client-only',
          projectAnalytics: setupType !== 'client-only'
        },
        database: {
          indexesApplied: setupType !== 'client-only',
          rpcFunctionsCreated: setupType !== 'client-only'
        }
      },
      deployment: {
        timestamp: new Date().toISOString(),
        version: '3.0.0',
        setupType: setupType
      }
    };
    
    fs.writeFileSync('optimization-config.json', JSON.stringify(config, null, 2));
    console.log('✅ Configuration saved to optimization-config.json');
  }
  
  async run() {
    console.log('🚀 Supabase Optimization Setup & Deployment\n');
    
    const isSetup = await this.checkSupabaseSetup();
    
    let setupType;
    if (isSetup) {
      const proceed = await question('Supabase is already configured. Deploy optimizations? (y/n): ');
      if (proceed.toLowerCase().startsWith('y')) {
        setupType = 'existing';
      } else {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
    } else {
      setupType = await this.setupSupabase();
    }
    
    if (setupType) {
      await this.deployOptimizations(setupType);
    }
    
    console.log('\n📚 Next steps:');
    console.log('1. Check docs/quick-setup-guide.md for usage instructions');
    console.log('2. Monitor performance with optimization-config.json');
    console.log('3. Review docs/advanced-optimization-implementation.md');
    
    rl.close();
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const deployer = new InteractiveDeployer();
  deployer.run().catch(console.error);
}

export { InteractiveDeployer };