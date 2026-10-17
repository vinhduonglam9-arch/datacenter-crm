import requests
import json
import time

prompt = """<|im_start|>system
你是一个专业的数据中心客户关系管理 (CRM) 名片与人物资料解析助手。请根据提供的名片OCR识别文本，提取字段并仅返回标准 JSON 对象，禁止返回任何 markdown 标记或额外解释。格式如下：
{
  "name": "姓名",
  "title": "职位头衔",
  "company": "公司或机构名称",
  "phone": "联系电话",
  "email": "电子邮箱",
  "bio": "核心职责与业务背景摘要",
  "tags": ["标签1", "标签2", "本地CPU识别"]
}
<|im_end|>
<|im_start|>user
名片原始文本内容如下：
李晨阳
算力网络事业部 架构总监
北京世纪互联宽带数据中心有限公司
手机: 13800138000
邮箱: cy.li@21vianet.com
主导华北智算集群供电及暖通节能方案设计
<|im_end|>
<|im_start|>assistant
"""

t0 = time.time()
resp = requests.post('http://127.0.0.1:8089/completion', json={
    'prompt': prompt,
    'n_predict': 256,
    'temperature': 0.1,
    'stop': ['<|im_end|>', '<|endoftext|>']
}, timeout=15)
elapsed = time.time() - t0

print(f"HTTP Status: {resp.status_code}, Elapsed: {elapsed:.2f}s")
data = resp.json()
print("Raw Content:", data.get('content'))
