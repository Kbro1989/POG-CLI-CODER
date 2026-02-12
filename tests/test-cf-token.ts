
async function mainCfTokenTest() {
    const token = '5Vyh-R1quEolvMxzB-svDOjA8Y9--zeUM_YHLOYy'; // Hardcoded ensuring usage
    console.log(`Testing new token: ${token.substring(0, 5)}...`);

    try {
        const response = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        console.log(`Status: ${response.status}`);
        const text = await response.text();
        console.log(`Body: ${text}`);
    } catch (e) {
        console.error(e);
    }
}

mainCfTokenTest();
