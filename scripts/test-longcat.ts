async function main() {
  const API_KEY = 'ak_2nA4QZ1ox97N5A47zS9MF6el3hf2l'
  const BASE_URL = 'https://api.longcat.chat/anthropic'

  console.log('测试 LongCat API...\n')

  try {
    const response = await fetch(`${BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'LongCat-Flash-Lite',
        max_tokens: 500,
        messages: [{ role: 'user', content: '你好，请回复"测试成功"' }],
      }),
    })

    console.log('状态码:', response.status)
    console.log('响应头:', Object.fromEntries(response.headers.entries()))
    const text = await response.text()
    console.log('响应体:', text.slice(0, 500))
  } catch (error) {
    console.error('请求失败:', error)
  }

  console.log('\n--- 尝试 Authorization Bearer ---\n')

  try {
    const response = await fetch(`${BASE_URL}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'LongCat-Flash-Lite',
        max_tokens: 500,
        messages: [{ role: 'user', content: '你好，请回复"测试成功"' }],
      }),
    })

    console.log('状态码:', response.status)
    const text = await response.text()
    console.log('响应体:', text.slice(0, 500))
  } catch (error) {
    console.error('请求失败:', error)
  }
}

main()
