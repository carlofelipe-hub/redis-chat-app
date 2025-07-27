import dotenv from 'dotenv';
import { redis } from '../lib/redis';

// Load environment variables
dotenv.config();

async function testRedis() {
  try {
    console.log('Testing Redis connection...');
    console.log('Redis URL set:', !!process.env.REDIS_URL);
    console.log('Redis host:', process.env.REDIS_URL?.split('@')[1]); // Don't log password
    
    // Test basic ping
    const pong = await redis.ping();
    console.log('✅ Redis ping response:', pong);
    
    // Test set/get
    await redis.set('test:connection', 'working', 'EX', 10);
    const value = await redis.get('test:connection');
    console.log('✅ Redis set/get test:', value);
    
    // Test if we can use Redis operations
    await redis.sadd('test:set', 'item1', 'item2');
    const members = await redis.smembers('test:set');
    console.log('✅ Redis set operations:', members);
    
    // Cleanup
    await redis.del('test:connection', 'test:set');
    console.log('✅ Redis cleanup completed');
    
    console.log('\n🎉 Redis is working correctly!');
    
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 Connection refused - Redis server might not be accessible');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('💡 Connection timeout - Network or firewall issue');
    } else if (error.code === 'ENOTFOUND') {
      console.log('💡 Host not found - Check the Redis URL');
    }
  } finally {
    process.exit();
  }
}

testRedis();