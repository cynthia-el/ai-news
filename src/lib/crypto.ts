/**
 * AES-256-GCM 加密工具
 *
 * 用于加密存储敏感数据（如钉钉 webhook secret）
 * 密钥通过环境变量 ENCRYPTION_KEY 提供，应为 32 字节 Base64 编码
 */

import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16 // 128-bit
const AUTH_TAG_LENGTH = 16 // 128-bit

function getKey(): Buffer {
  const keyB64 = process.env.ENCRYPTION_KEY
  if (!keyB64) {
    throw new Error('ENCRYPTION_KEY 环境变量未设置')
  }
  const key = Buffer.from(keyB64, 'base64')
  if (key.length !== 32) {
    throw new Error(`ENCRYPTION_KEY 解码后必须是 32 字节，当前为 ${key.length} 字节`)
  }
  return key
}

/** 生成随机 IV */
function generateIv(): Buffer {
  return crypto.randomBytes(IV_LENGTH)
}

/**
 * 加密明文
 * 返回格式: base64(iv + ciphertext + authTag)
 */
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = generateIv()
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)

  let ciphertext = cipher.update(plaintext, 'utf8', 'hex')
  ciphertext += cipher.final('hex')

  const authTag = cipher.getAuthTag()

  // 拼接: iv (16B) + ciphertext + authTag (16B)
  const buffer = Buffer.concat([iv, Buffer.from(ciphertext, 'hex'), authTag])
  return buffer.toString('base64')
}

/**
 * 解密
 * 输入格式: base64(iv + ciphertext + authTag)
 */
export function decrypt(ciphertextB64: string): string {
  const key = getKey()
  const buffer = Buffer.from(ciphertextB64, 'base64')

  if (buffer.length < IV_LENGTH + AUTH_TAG_LENGTH + 1) {
    throw new Error('密文格式不正确')
  }

  const iv = buffer.subarray(0, IV_LENGTH)
  const authTag = buffer.subarray(buffer.length - AUTH_TAG_LENGTH)
  const ciphertext = buffer.subarray(IV_LENGTH, buffer.length - AUTH_TAG_LENGTH)

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(ciphertext, undefined, 'utf8')
  plaintext += decipher.final('utf8')

  return plaintext
}
