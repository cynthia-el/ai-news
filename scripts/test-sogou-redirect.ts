async function testRedirect() {
  const sogouLink = '/link?url=dn9a_-gY295K0Rci_xozVXfdMkSQTLW6cwJThYulHEtVjXrGTiVgS3bQ8kIDrXJjiz85TzrRY1EAtbaFyMqsiFqXa8Fplpd9b8Ur1ZeFV56TeTBXoJtTt4AyPOg1nVdhmdJm_XrRZd2-qI0CFqXgox_pcB67amzXpX7hYhWqAvoAMXHAWbUcKpFSSP_-0cwBZoU9lUoYKXBzHcLH7iOYXhaRdCKiK4fR4nodstF_UAJJPWwMnb2n8L5rvAgRLqTPxVClKaXWOtKTJmCU1UgHwQ..&type=2&query=77度&token=C1A9D79D0E292C0A75702743D2994D0676F375C56A0D0D16'
  const fullUrl = 'https://weixin.sogou.com' + sogouLink
  try {
    const res = await fetch(fullUrl, {
      redirect: 'manual',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://weixin.sogou.com/',
      },
    })
    console.log('status:', res.status)
    console.log('location:', res.headers.get('location'))
    console.log('headers:', [...res.headers.entries()])
  } catch (e: any) {
    console.log('error:', e.message)
  }
}

testRedirect().catch(console.error)
