/**
 * Pure heuristic parser for business card and profile OCR text
 */

export interface ParsedProfile {
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  bio: string;
  tags: string[];
}

const KNOWN_TITLES = [
  '董事长', '总裁', '总经理', 'CEO', 'CTO', 'CIO', 'CFO', 'COO', 'VP', '副总裁',
  '总监', '副总监', '主任', '部长', '处长', '科长', '院长', '副院长', '总工', '总工程师',
  '架构师', '专家', '经理', '主管', '顾问', '合伙人', '负责人', '工程师', '采购', '招采'
];

export function parseBusinessCardText(rawText: string): ParsedProfile {
  if (!rawText || !rawText.trim()) {
    return {
      name: '未命名联系人',
      title: '待确认职位',
      company: '',
      phone: '',
      email: '',
      bio: '',
      tags: ['OCR识别'],
    };
  }

  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  let phone = '';
  let email = '';
  let company = '';
  let title = '';
  let name = '';
  const tags: string[] = ['OCR识别'];

  for (const line of lines) {
    if (!phone) {
      const phoneMatch = line.match(/(?:(?:\+?86)?\s*)?(1[3-9]\d{9}|0\d{2,3}-?\d{7,8})/);
      if (phoneMatch) {
        phone = phoneMatch[1].replace(/\s+/g, '');
      }
    }
    if (!email) {
      const emailMatch = line.match(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/);
      if (emailMatch) {
        email = emailMatch[0];
      }
    }
  }

  for (const line of lines) {
    if (
      !company &&
      /(公司|集团|设计院|研究院|中心|科技|智算|通信|数据|有限|股份)/.test(line) &&
      line.length >= 4 &&
      line.length <= 40
    ) {
      company = line.replace(/^(单位|公司|机构)[：:]\s*/, '').trim();
      break;
    }
  }

  for (const line of lines) {
    for (const t of KNOWN_TITLES) {
      if (line.includes(t)) {
        const tokens = line.split(/\s+/);
        const matchedToken = tokens.find((tok) => tok.includes(t));
        title = (matchedToken || t).replace(/^(职位|职务|头衔)[：:]\s*/, '').trim();
        break;
      }
    }
    if (title) break;
  }

  for (const line of lines) {
    if (line === company || line === title) {
      continue;
    }
    let cleanLine = line
      .replace(/^(姓名|联系人)[：:]\s*/, '')
      .replace(phone, '')
      .trim();
    if (email) {
      cleanLine = cleanLine.replace(email, '').trim();
    }

    if (/^[\u4e00-\u9fa5]{2,4}$/.test(cleanLine)) {
      name = cleanLine;
      break;
    }
    if (/^[A-Za-z\s]{3,20}$/.test(cleanLine) && !cleanLine.toLowerCase().includes('ltd')) {
      name = cleanLine;
      break;
    }
    const tokens = cleanLine.split(/\s+/);
    for (const token of tokens) {
      if (/^[\u4e00-\u9fa5]{2,4}$/.test(token) && !KNOWN_TITLES.some((t) => token.includes(t))) {
        name = token;
        break;
      }
    }
    if (name) break;
  }

  if (!name && lines.length > 0) {
    for (const line of lines) {
      if (line !== company && !line.includes('@') && !/\d{5,}/.test(line) && line.length <= 8) {
        name = line;
        break;
      }
    }
  }

  if (!name) name = '新识别联系人';
  if (!title) title = '业务负责人';

  const bioParts: string[] = [];
  for (const line of lines) {
    if (
      line !== name &&
      line !== title &&
      line !== company &&
      !line.includes(phone) &&
      (!email || !line.includes(email))
    ) {
      if (line.length > 2 && !/^(电话|手机|邮箱|地址|Email|Tel|Mobile|Fax)/i.test(line)) {
        bioParts.push(line);
      }
    }
  }

  let bio = bioParts.slice(0, 3).join(' · ');
  if (!bio) {
    bio = `${company ? company + ' ' : ''}${title}（通过名片 OCR 导入）`;
  }

  if (company) {
    tags.push(company.length > 8 ? company.slice(0, 8) : company);
  }

  return {
    name,
    title,
    company,
    phone,
    email,
    bio,
    tags,
  };
}
