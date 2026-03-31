import httpx
import asyncio

async def test_translate():
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post(
                'http://127.0.0.1:8000/chat/translate-text',
                json={'text': 'Hello World', 'target_language': 'hi'},
                timeout=10.0
            )
            print("Status:", res.status_code)
            print("Response:", res.json())
    except Exception as e:
        print("Error:", str(e))

asyncio.run(test_translate())
