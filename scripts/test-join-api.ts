// Simple test to understand what's happening with the join API

async function testJoinAPI() {
  try {
    console.log('Testing join API...');
    
    // We need to simulate a logged-in request
    // For now, let's just test if the endpoint exists
    const response = await fetch('http://localhost:3000/api/rooms/general-room/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    const responseText = await response.text();
    console.log('Response body:', responseText);

  } catch (error) {
    console.error('Test error:', error);
  }
}

// Only run this if you have the dev server running
console.log('This test requires the dev server to be running on localhost:3000');
console.log('Run: npm run dev');
console.log('Then call: testJoinAPI()');

export { testJoinAPI };