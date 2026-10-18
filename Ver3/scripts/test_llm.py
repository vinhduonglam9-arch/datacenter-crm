import subprocess
import json

test_raw = """
李晨阳
算力网络事业部 架构总监
北京世纪互联宽带数据中心有限公司
手机: 13800138000
邮箱: cy.li@21vianet.com
主导华北智算集群供电及暖通节能方案设计
"""

prompt = f"""<|im_start|>system
你是一个专业的数据中心客户关系管理 (CRM) 名片与人物资料解析助手。请根据提供的名片OCR识别文本，提取字段并仅返回标准 JSON 对象，禁止返回任何 markdown 标记或额外解释。格式如下：
{{
  "name": "姓名",
  "title": "职位头衔",
  "company": "公司或机构名称",
  "phone": "联系电话",
  "email": "电子邮箱",
  "bio": "核心职责与业务背景摘要",
  "tags": ["标签1", "标签2", "本地CPU识别"]
}}
<|im_end|>
<|im_start|>user
名片原始文本内容如下：
{test_raw}
<|im_end|>
<|im_start|>assistant
"""

p = subprocess.run([
    'bin/llama/llama-cli.exe',
    '-m', 'models/llm/qwen2.5-1.5b-instruct-q4_k_m.gguf',
    '-p', prompt,
    '-n', '256',
    '--temp', '0.1',
    '--no-warmup'
], capture_output=True, text=True, encoding='utf-8')

print("=== RAW MODEL OUTPUT ===")
for line in p.stdout.splitlines():
    if any(k in line for k in ["name", "title", "company", "phone", "email", "bio", "tags", "{", "}"]):
        print(line)
