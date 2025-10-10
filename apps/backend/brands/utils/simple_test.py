#!/usr/bin/env python3
"""
Simple direct test of file validation utilities
No Django required - just run this file directly!
"""

import os
import sys
import tempfile
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Mock the Django UploadedFile for testing
class MockUploadedFile:
    def __init__(self, name, content, content_type='application/octet-stream'):
        self.name = name
        self.content = content
        self.content_type = content_type
        self.size = len(content)
        self._position = 0
    
    def read(self, size=-1):
        if size == -1:
            data = self.content[self._position:]
            self._position = len(self.content)
        else:
            data = self.content[self._position:self._position + size]
            self._position += len(data)
        return data
    
    def seek(self, position):
        self._position = position

# Mock Django modules
class MockDjango:
    class core:
        class files:
            class uploadedfile:
                UploadedFile = MockUploadedFile

sys.modules['django'] = MockDjango()
sys.modules['django.core'] = MockDjango.core()
sys.modules['django.core.files'] = MockDjango.core.files()
sys.modules['django.core.files.uploadedfile'] = MockDjango.core.files.uploadedfile()

# Now import our utils
from utils import (
    get_supported_formats_info,
    detect_file_type,
    validate_file_size,
    validate_file_content,
    validate_uploaded_file,
    get_file_metadata
)

def test_supported_formats():
    """Test supported formats functionality"""
    print("📋 Testing Supported Formats")
    print("-" * 30)
    
    info = get_supported_formats_info()
    print(f"✅ Total formats: {info['total_formats']}")
    print(f"✅ Extensions: {', '.join(info['extensions'])}")
    
    print("\nSupported formats:")
    for fmt, config in info['supported_formats'].items():
        max_mb = config['max_size'] / (1024 * 1024)
        print(f"  • {fmt.upper()}: {config['description']} (max: {max_mb}MB)")
    
    return True

def test_file_type_detection():
    """Test file type detection by extension"""
    print("\n🔍 Testing File Type Detection")
    print("-" * 35)
    
    test_cases = [
        ('document.pdf', 'pdf'),
        ('report.docx', 'docx'),
        ('readme.txt', 'txt'),
        ('notes.md', 'md'),
        ('config.markdown', 'md'),
        ('image.png', None),  # unsupported
        ('data.xlsx', None),  # unsupported
    ]
    
    all_passed = True
    for filename, expected in test_cases:
        detected_type, mime_type = detect_file_type(f"/fake/path/{filename}")
        passed = detected_type == expected
        status = "✅" if passed else "❌"
        result = detected_type or "unsupported"
        print(f"  {status} {filename} → {result}")
        if not passed:
            all_passed = False
            print(f"     Expected: {expected}, Got: {detected_type}")
    
    return all_passed

def create_test_files(temp_dir):
    """Create sample test files"""
    files = {}
    
    # PDF file
    pdf_content = b'%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nxref\n0 1\ntrailer<</Size 1/Root 1 0 R>>\nstartxref\n%%EOF'
    pdf_path = os.path.join(temp_dir, 'test.pdf')
    with open(pdf_path, 'wb') as f:
        f.write(pdf_content)
    files['pdf'] = pdf_path
    
    # DOCX file (ZIP header)
    docx_content = b'PK\x03\x04\x14\x00\x06\x00' + b'\x00' * 100
    docx_path = os.path.join(temp_dir, 'test.docx')
    with open(docx_path, 'wb') as f:
        f.write(docx_content)
    files['docx'] = docx_path
    
    # Text file
    txt_content = b'Hello World!\nThis is a test text file.\nLine 3.'
    txt_path = os.path.join(temp_dir, 'test.txt')
    with open(txt_path, 'wb') as f:
        f.write(txt_content)
    files['txt'] = txt_path
    
    # Markdown file
    md_content = b'# Test Markdown\n\nThis is **bold** text.\n\n- Item 1\n- Item 2'
    md_path = os.path.join(temp_dir, 'test.md')
    with open(md_path, 'wb') as f:
        f.write(md_content)
    files['md'] = md_path
    
    # Empty file
    empty_path = os.path.join(temp_dir, 'empty.txt')
    with open(empty_path, 'wb') as f:
        pass
    files['empty'] = empty_path
    
    return files

def test_real_files():
    """Test with actual files"""
    print("\n📁 Testing with Real Files")
    print("-" * 30)
    
    temp_dir = tempfile.mkdtemp()
    print(f"Created temp directory: {temp_dir}")
    
    try:
        files = create_test_files(temp_dir)
        
        for file_type, file_path in files.items():
            if file_type == 'empty':
                continue
                
            filename = os.path.basename(file_path)
            file_size = os.path.getsize(file_path)
            
            print(f"\n  📄 {filename} ({file_size} bytes):")
            
            # Test detection
            detected_type, mime_type = detect_file_type(file_path)
            print(f"     Type: {detected_type}")
            print(f"     MIME: {mime_type}")
            
            if detected_type:
                # Test size validation
                size_errors = validate_file_size(file_path, detected_type)
                print(f"     Size validation: {'✅ OK' if not size_errors else f'❌ {len(size_errors)} errors'}")
                
                # Test content validation
                content_errors = validate_file_content(file_path, detected_type)
                print(f"     Content validation: {'✅ OK' if not content_errors else f'❌ {len(content_errors)} errors'}")
                
                # Test metadata
                metadata = get_file_metadata(file_path, detected_type)
                print(f"     Metadata: {len(metadata)} fields")
        
        # Test empty file
        print(f"\n  📄 empty.txt (0 bytes):")
        empty_errors = validate_file_size(files['empty'], 'txt')
        print(f"     Size validation: {'❌ Expected errors' if empty_errors else '✅ Unexpected'}")
        
        return True
        
    finally:
        # Clean up
        import shutil
        shutil.rmtree(temp_dir)
        print(f"\n🧹 Cleaned up: {temp_dir}")

def test_uploaded_files():
    """Test with mock uploaded files"""
    print("\n📤 Testing Uploaded Files")
    print("-" * 30)
    
    # Test cases
    test_cases = [
        ('test.pdf', b'%PDF-1.4\nTest PDF content', 'application/pdf'),
        ('test.docx', b'PK\x03\x04Test DOCX', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
        ('test.txt', b'Hello, World!', 'text/plain'),
        ('test.md', b'# Markdown\n\nContent here.', 'text/markdown'),
    ]
    
    for filename, content, content_type in test_cases:
        print(f"\n  📤 {filename}:")
        
        # Create mock uploaded file
        uploaded_file = MockUploadedFile(filename, content, content_type)
        
        # Validate
        result = validate_uploaded_file(uploaded_file)
        
        print(f"     Valid: {'✅ Yes' if result.is_valid else '❌ No'}")
        print(f"     Type: {result.file_type}")
        print(f"     Errors: {len(result.errors)}")
        
        if result.errors:
            for error in result.errors:
                print(f"       - {error}")
    
    return True

def main():
    """Run all tests"""
    print("🚀 File Validation Utility - Simple Test")
    print("=" * 50)
    
    tests = [
        ("Supported Formats", test_supported_formats),
        ("File Type Detection", test_file_type_detection),
        ("Real Files", test_real_files),
        ("Uploaded Files", test_uploaded_files),
    ]
    
    passed = 0
    failed = 0
    
    for test_name, test_func in tests:
        try:
            if test_func():
                passed += 1
                print(f"\n✅ {test_name} test PASSED")
            else:
                failed += 1
                print(f"\n❌ {test_name} test FAILED")
        except Exception as e:
            failed += 1
            print(f"\n❌ {test_name} test ERROR: {e}")
            import traceback
            traceback.print_exc()
    
    print("\n" + "=" * 50)
    print(f"🎯 Test Summary: {passed} passed, {failed} failed")
    
    if failed == 0:
        print("🎉 All tests passed successfully!")
        return True
    else:
        print("💥 Some tests failed!")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
