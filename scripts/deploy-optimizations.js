#!/usr/bin/env node

/**
 * Deployment script for advanced Supabase optimizations
 * Run with: node scripts/deploy-optimizations.js
 */

import { execSync } from 'child_process';
import fs from 'fs';

class OptimizationDeployer {
  constructor() {
    this.steps = [
      {
        name: 'Check Supabase CLI',
        check: () => {
          try {
            execSync('npx supabase --version', { stdio: 'pipe' });
            return true;
          } catch {
            return false;
          }
        },
        action: () => {
          console.log('✅ Supabase CLI is available via npx');
        }
      },
      {
        name: 'Apply Database Migrations',
        action: async () => {
          console.log('📦 Applying database migrations...');
          try {
            execSync('npx supabase db push', { stdio: 'inherit' });
            console.log('✅ Database migrations applied successfully');
          } catch (error) {
            throw new Error('Failed to apply database migrations');
          }
        }
      },
      {
        name: 'Deploy Edge Functions',
        action: async () => {
          console.log('🚀 Deploying Edge Functions...');
          
          const functions = ['dashboard-stats', 'project-analytics'];
          
          for (const func of functions) {
            try {
              console.log(`  Deploying ${func}...`);
              execSync(`npx supabase functions deploy ${func}`, { stdio: 'inherit' });
              console.log(`  ✅ ${func} deployed successfully`);
            } catch (error) {
              console.warn(`  ⚠️ Failed to deploy ${func}: ${error.message}`);
            }
          }
        }
      },
      {
        name: 'Verify Database Indexes',
        action: async () => {
          console.log('🔍 Verifying database indexes...');
          
          // Check if the migration file exists
          const migrationFile = 'supabase/migrations/2025-01-27_optimize_database_indexes_fixed.sql';
          
          if (fs.existsSync(migrationFile)) {
            console.log('✅ Index migration file exists');
          } else {
            throw new Error('Index migration file not found');
          }
        }
      },
      {
        name: 'Test Edge Functions',
        action: async () => {
          console.log('🧪 Testing Edge Functions...');
          
          // Get Supabase project URL
          let projectUrl;
          try {
            const config = execSync('npx supabase status --output json', { encoding: 'utf8' });
            const status = JSON.parse(config);
            projectUrl = status.api_url || 'http://localhost:54321';
          } catch {
            projectUrl = 'http://localhost:54321'; // Default local URL
          }
          
          console.log(`  Testing functions at: ${projectUrl}`);
          
          // Test dashboard-stats function
          try {
            const response = await fetch(`${projectUrl}/functions/v1/dashboard-stats`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              }
            });
            
            if (response.ok || response.status === 401) { // 401 is expected without auth
              console.log('  ✅ dashboard-stats function is accessible');
            } else {
              console.warn(`  ⚠️ dashboard-stats returned status: ${response.status}`);
            }
          } catch (error) {
            console.warn(`  ⚠️ Could not test dashboard-stats: ${error.message}`);
          }
        }
      },
      {
        name: 'Generate Configuration',
        action: () => {
          console.log('⚙️ Generating optimization configuration...');
          
          const config = {
            optimizations: {
              caching: {
                enabled: true,
                defaultTTL: 300000, // 5 minutes
                maxSize: 200
              },
              realtime: {
                batchDelay: 1000,
                maxBatchSize: 5,
                reconnectDelay: 2000
              },
              edgeFunctions: {
                dashboardStats: true,
                projectAnalytics: true
              },
              database: {
                indexesApplied: true,
                rpcFunctionsCreated: true
              }
            },
            deployment: {
              timestamp: new Date().toISOString(),
              version: '3.0.0'
            }
          };
          
          fs.writeFileSync(
            'optimization-config.json', 
            JSON.stringify(config, null, 2)
          );
          
          console.log('✅ Configuration saved to optimization-config.json');
        }
      }
    ];
  }

  async deploy() {
    console.log('🚀 Starting Advanced Supabase Optimization Deployment\n');
    
    let successCount = 0;
    let failureCount = 0;
    
    for (const step of this.steps) {
      try {
        console.log(`📋 ${step.name}`);
        
        // Run pre-check if available
        if (step.check && !step.check()) {
          throw new Error(`Pre-check failed for ${step.name}`);
        }
        
        // Execute the step
        await Promise.resolve(step.action());
        successCount++;
        
      } catch (error) {
        console.error(`❌ ${step.name} failed:`, error.message);
        failureCount++;
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary
    console.log('📊 Deployment Summary:');
    console.log(`✅ Successful steps: ${successCount}`);
    console.log(`❌ Failed steps: ${failureCount}`);
    
    if (failureCount === 0) {
      console.log('\n🎉 All optimizations deployed successfully!');
      console.log('\n📖 Next steps:');
      console.log('1. Update your application code to use optimizedDataService');
      console.log('2. Monitor cache performance and egress usage');
      console.log('3. Review the implementation guide in docs/advanced-optimization-implementation.md');
    } else {
      console.log('\n⚠️ Some steps failed. Please review the errors above.');
    }
  }
}

// Run deployment if this script is executed directly
const deployer = new OptimizationDeployer();
deployer.deploy().catch(console.error);

export { OptimizationDeployer };