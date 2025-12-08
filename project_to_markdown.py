import os
import sys

# ================= 配置区域 =================

# 输出的文件名
OUTPUT_FILE = 'script.md'

# 需要包含的文件后缀 (根据你的项目需求添加)
INCLUDE_EXTENSIONS = {
    '.py', '.java', '.c', '.cpp', '.h', '.cs', '.go', '.rs',  # 后端/系统
    '.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css', '.scss', '.less', # 前端
    '.json', '.xml', '.yaml', '.yml', '.ini', '.toml', '.conf', '.properties', # 配置
    '.sql', '.sh', '.bat', '.ps1', '.dockerfile', 'makefile', 'cmakelists.txt', # 脚本/构建
    '.md', '.txt' # 文档 (注意：脚本会自动排除输出文件本身)
}

# 需要忽略的目录 (防止生成的文件过大或包含垃圾文件)
IGNORE_DIRS = {
    '.git', '.svn', '.hg', '.idea', '.vscode', '.settings', # 版本控制与IDE
    '__pycache__', 'venv', 'env', '.env', 'node_modules',   # 依赖与环境
    'dist', 'build', 'target', 'bin', 'obj',                # 构建产物
    'coverage', 'logs', 'tmp', 'temp', 'assets', 'images'   # 其他
}

# 需要忽略的具体文件名
IGNORE_FILES = {
    'package-lock.json', 'yarn.lock', '.DS_Store', 'Thumbs.db', 
    OUTPUT_FILE, os.path.basename(__file__) # 排除输出文件和本脚本
}

# ================= 逻辑区域 =================

def is_ignored(path, is_dir=False):
    """检查路径是否在忽略列表中"""
    name = os.path.basename(path)
    if is_dir:
        return name in IGNORE_DIRS
    return name in IGNORE_FILES

def is_text_file(filepath):
    """
    检查文件后缀是否在允许列表中。
    对于没有后缀的文件（如 Makefile, Dockerfile），直接检查文件名小写。
    """
    ext = os.path.splitext(filepath)[1].lower()
    name = os.path.basename(filepath).lower()
    
    if ext in INCLUDE_EXTENSIONS:
        return True
    if name in INCLUDE_EXTENSIONS: # 处理 Dockerfile 等情况
        return True
    return False

def generate_tree_structure(startpath):
    """生成目录树状结构的字符串"""
    tree_str = f"# Project Structure\n\nroot: {os.path.basename(os.path.abspath(startpath))}\n"
    
    for root, dirs, files in os.walk(startpath):
        # 过滤忽略的目录
        dirs[:] = [d for d in dirs if not is_ignored(os.path.join(root, d), is_dir=True)]
        
        level = root.replace(startpath, '').count(os.sep)
        indent = '│   ' * (level)
        
        # 添加当前目录下的文件（仅限关注的文件类型，避免树太长）
        subindent = '│   ' * (level + 1)
        
        # 如果不是根目录，打印目录名
        if root != startpath:
            tree_str += f"{indent}├── {os.path.basename(root)}/\n"
        
        # 过滤并排序文件
        valid_files = [f for f in files if not is_ignored(os.path.join(root, f)) and is_text_file(f)]
        valid_files.sort()
        
        for i, f in enumerate(valid_files):
            is_last = (i == len(valid_files) - 1) and not dirs
            prefix = '└── ' if is_last and not dirs else '├── ' 
            # 简化展示：根目录下直接显示，子目录下加缩进
            if root == startpath:
                tree_str += f"{prefix}{f}\n"
            else:
                tree_str += f"{subindent}{prefix}{f}\n"
                
    return tree_str + "\n"

def get_file_content(filepath, root_path):
    """读取文件内容并包装成Markdown代码块"""
    rel_path = os.path.relpath(filepath, root_path)
    ext = os.path.splitext(filepath)[1].lower().replace('.', '')
    
    # 处理特殊文件名对应的语言标签
    filename = os.path.basename(filepath).lower()
    if filename == 'dockerfile': ext = 'dockerfile'
    if filename == 'makefile': ext = 'makefile'
    if ext == '': ext = 'text' # 无后缀默认为text

    content_block = f"\n## File: {rel_path}\n\n"
    content_block += f"```{ext}\n"
    
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content_block += f.read()
    except UnicodeDecodeError:
        try:
            # 尝试 GBK (针对 Windows 一些旧文件)
            with open(filepath, 'r', encoding='gbk') as f:
                content_block += f.read()
        except Exception:
            return f"\n## File: {rel_path}\n\n(Error: Unable to decode file - Binary or unknown encoding)\n"
    except Exception as e:
        return f"\n## File: {rel_path}\n\n(Error reading file: {str(e)})\n"
        
    content_block += "\n```\n"
    return content_block

def main():
    root_path = os.getcwd()
    print(f"Start scanning project at: {root_path}")
    print(f"Target file: {OUTPUT_FILE}")
    
    final_output = []
    
    # 1. 生成目录树
    print("Generating file tree...")
    tree = generate_tree_structure(root_path)
    final_output.append(tree)
    
    # 2. 遍历并读取文件内容
    print("Reading file contents...")
    file_count = 0
    
    for root, dirs, files in os.walk(root_path):
        # 过滤目录
        dirs[:] = [d for d in dirs if not is_ignored(os.path.join(root, d), is_dir=True)]
        
        for file in files:
            filepath = os.path.join(root, file)
            
            if is_ignored(filepath):
                continue
                
            if is_text_file(filepath):
                file_count += 1
                final_output.append(get_file_content(filepath, root_path))
    
    # 3. 写入最终文件
    with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
        f.write("\n".join(final_output))
        
    print(f"Done! Scanned {file_count} files.")
    print(f"Project context saved to: {os.path.join(root_path, OUTPUT_FILE)}")

if __name__ == "__main__":
    main()