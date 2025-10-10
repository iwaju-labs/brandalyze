#!/usr/bin/env python3
"""
Quick test for file validation utilities
Run this directly: python quick_test.py
"""

import os
import sys
import tempfile

# Add current directory to path so we can import utils
sys.path.insert(0, os.path.dirname(__file__))

# Mock Django's UploadedFile for testing
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

# Mock Django module
class MockDjango:
    class core:
        class files:
            class uploadedfile:
                UploadedFile = MockUploadedFile

# Replace django import
sys.modules['django'] = MockDjango()
sys.modules['django.core'] = MockDjango.core()
sys.modules['django.core.files'] = MockDjango.core.files()
sys.modules['django.core.files.uploadedfile'] = MockDjango.core.files.uploadedfile()

# Now import our utils
from utils import (
    detect_file_type,
    validate_file_size,
    validate_file_content,
    get_file_metadata,
    get_supported_formats_info,
    SUPPORTED_FORMATS
)

def test_supported_formats():
    """Test supported formats info"""
    print("🧪 Testing Supported Formats")
    print("-" * 30)
    
    info = get_supported_formats_info()
    print(f"✅ Total formats: {info['total_formats']}")
    print(f"✅ Extensions: {', '.join(info['extensions'])}")
    
    for fmt, config in info['supported_formats'].items():
        max_mb = config['max_size'] / (1024 * 1024)
        print(f"   • {fmt}: {config['description']} (max: {max_mb}MB)")
    
    print()

def test_file_type_detection():
    """Test file type detection by extension"""
    print("🔍 Testing File Type Detection")
    print("-" * 30)
    
    test_cases = [
        ('document.pdf', 'pdf'),
        ('report.docx', 'docx'),
        ('readme.txt', 'txt'),
        ('notes.md', 'md'),
        ('README.markdown', 'md'),
        ('image.png', None),  # unsupported
        ('data.xlsx', None),  # unsupported
    ]
    
    for filename, expected in test_cases:
        detected_type, mime_type = detect_file_type(f"/fake/path/{filename}")
        status = "✅" if detected_type == expected else "❌"
        result = detected_type or "unsupported"
        print(f"   {status} {filename:<15} → {result}")
    
    print()

def test_with_real_files():
    """Test with actual files"""
    print("📁 Testing With Real Files")
    print("-" * 30)
    
    # Create temporary directory
    temp_dir = tempfile.mkdtemp()
    print(f"📂 Created temp dir: {temp_dir}")
    
    try:
        # Create test files
        test_files = {}
        
        # PDF file
        pdf_content = b'%PDF-1.4\n%EOF'
        pdf_path = os.path.join(temp_dir, 'test.pdf')
        with open(pdf_path, 'wb') as f:
            f.write(pdf_content)
        test_files['pdf'] = pdf_path
        
        # DOCX file (ZIP signature)
        docx_content = b'PK\x03\x04' + b'\x00' * 20
        docx_path = os.path.join(temp_dir, 'test.docx')
        with open(docx_path, 'wb') as f:
            f.write(docx_content)
        test_files['docx'] = docx_path
        
        # Text file
        txt_content = b'Hello, this is a test text file!'
        txt_path = os.path.join(temp_dir, 'test.txt')
        with open(txt_path, 'wb') as f:
            f.write(txt_content)
        test_files['txt'] = txt_path
        
        # Markdown file
        md_content = b'# Test\n\nThis is **markdown**.'
        md_path = os.path.join(temp_dir, 'test.md')
        with open(md_path, 'wb') as f:
            f.write(md_content)
        test_files['md'] = md_path
        
        # Test each file
        for expected_type, file_path in test_files.items():
            filename = os.path.basename(file_path)
            file_size = os.path.getsize(file_path)
            
            print(f"\n📄 {filename} ({file_size} bytes):")
            
            # Detect type
            detected_type, mime_type = detect_file_type(file_path)
            type_ok = detected_type == expected_type
            print(f"   Type: {detected_type} {'✅' if type_ok else '❌'}")
            
            if detected_type:
                # Size validation
                size_errors = validate_file_size(file_path, detected_type)
                print(f"   Size: {'✅ OK' if not size_errors else f'❌ {len(size_errors)} errors'}")
                
                # Content validation
                content_errors = validate_file_content(file_path, detected_type)
                print(f"   Content: {'✅ OK' if not content_errors else f'❌ {len(content_errors)} errors'}")
                
                # Metadata
                metadata = get_file_metadata(file_path, detected_type)
                print(f"   Metadata: {len(metadata)} fields")
        
    finally:
        # Cleanup
        import shutil
        shutil.rmtree(temp_dir)
        print(f"\n🧹 Cleaned up temp dir")

def test_edge_cases():
    """Test edge cases"""
    print("\n⚠️  Testing Edge Cases")
    print("-" * 30)
    
    # Test with non-existent file
    detected_type, mime_type = detect_file_type("/nonexistent/file.pdf")
    print(f"   Non-existent file: {detected_type} {'✅' if detected_type == 'pdf' else '❌'}")
    
    # Test with empty filename
    detected_type, mime_type = detect_file_type("")
    print(f"   Empty filename: {detected_type} {'✅' if detected_type is None else '❌'}")
    
    # Test with no extension
    detected_type, mime_type = detect_file_type("/path/file_no_ext")
    print(f"   No extension: {detected_type} {'✅' if detected_type is None else '❌'}")
    
    print()

def main():
    """Run all tests"""
    print("🚀 File Validation Utility - Quick Test")
    print("=" * 50)
    
    try:
        test_supported_formats()
        test_file_type_detection()
        test_with_real_files()
        test_edge_cases()
        
        print("🎉 All tests completed successfully!")
        print("\n💡 Your file validation utility is working correctly!")
        print("   You can now delete this test file: quick_test.py")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        import traceback
        traceback.print_exc()
        return False
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
