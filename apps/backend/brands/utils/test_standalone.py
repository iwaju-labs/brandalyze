#!/usr/bin/env python3
"""
Standalone test script for file validation utilities
Run this script directly without Django to test the basic functionality
"""

import os
import sys
import tempfile
from pathlib import Path

# Add the project root to Python path so we can import the utils
project_root = Path(__file__).parent.parent.parent.parent.parent
sys.path.insert(0, str(project_root))

# Mock Django components for standalone testing
class MockUploadedFile:
    """Mock Django UploadedFile for standalone testing"""
    def __init__(self, name, content, content_type=None):
        self.name = name
        self.content = content
        self.content_type = content_type or 'application/octet-stream'
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

# Mock Django's SimpleUploadedFile
SimpleUploadedFile = MockUploadedFile

def test_basic_functionality():
    """Test basic functionality without files"""
    print("🧪 Testing Basic Functionality")
    print("=" * 40)
    
    # Import after setting up mocks
    try:
        from apps.backend.brands.utils.utils import (
            get_supported_formats_info,
            detect_file_type
        )
        
        # Test supported formats
        print("\n📋 Supported Formats:")
        info = get_supported_formats_info()
        print(f"Total formats: {info['total_formats']}")
        print(f"Extensions: {', '.join(info['extensions'])}")
        
        for format_name, config in info['supported_formats'].items():
            max_size_mb = config['max_size'] / (1024 * 1024)
            print(f"  • {format_name}: {config['description']} (max: {max_size_mb}MB)")
        
        # Test file type detection (extension-based)
        print("\n🔍 File Type Detection (by extension):")
        test_files = [
            'document.pdf',
            'report.docx', 
            'readme.txt',
            'notes.md',
            'image.png',  # unsupported
            'data.xlsx'   # unsupported
        ]
        
        for filename in test_files:
            detected_type, mime_type = detect_file_type(f"/fake/path/{filename}")
            status = "✅" if detected_type else "❌"
            print(f"  {status} {filename} → {detected_type or 'unsupported'}")
        
        print("\n✅ Basic functionality test passed!")
        return True
        
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("Make sure you're running this from the correct directory")
        return False
    except Exception as e:
        print(f"❌ Test failed: {e}")
        return False

def test_with_real_files():
    """Test with real files"""
    print("\n🗂️  Testing with Real Files")
    print("=" * 40)
    
    try:
        from apps.backend.brands.utils.utils import (
            detect_file_type,
            validate_file_size,
            validate_file_content,
            get_file_metadata
        )
        
        # Create temporary directory
        temp_dir = tempfile.mkdtemp()
        print(f"Creating test files in: {temp_dir}")
        
        # Create test files
        test_files = create_test_files(temp_dir)
        
        # Test each file
        for file_type, file_path in test_files.items():
            print(f"\n📄 Testing {file_type.upper()} file:")
            
            # Get file size
            file_size = os.path.getsize(file_path)
            print(f"   Size: {file_size} bytes")
            
            # Detect type
            detected_type, mime_type = detect_file_type(file_path)
            print(f"   Detected: {detected_type} (MIME: {mime_type})")
            
            if detected_type:
                # Validate size
                size_errors = validate_file_size(file_path, detected_type)
                print(f"   Size validation: {'✅ OK' if not size_errors else f'❌ {len(size_errors)} errors'}")
                
                # Validate content
                content_errors = validate_file_content(file_path, detected_type)
                print(f"   Content validation: {'✅ OK' if not content_errors else f'❌ {len(content_errors)} errors'}")
                
                # Get metadata
                metadata = get_file_metadata(file_path, detected_type)
                print(f"   Metadata: {len(metadata)} fields")
            else:
                print(f"   ❌ Type not detected or unsupported")
        
        # Clean up
        import shutil
        shutil.rmtree(temp_dir)
        print(f"\n🧹 Cleaned up: {temp_dir}")
        
        print("\n✅ Real files test passed!")
        return True
        
    except Exception as e:
        print(f"❌ Real files test failed: {e}")
        import traceback
        traceback.print_exc()
        return False

def create_test_files(temp_dir):
    """Create sample test files"""
    test_files = {}
    
    # PDF file with minimal valid structure
    pdf_content = b'%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R>>endobj\nxref\n0 4\n0000000000 65535 f\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n%%EOF'
    pdf_path = os.path.join(temp_dir, 'sample.pdf')
    with open(pdf_path, 'wb') as f:
        f.write(pdf_content)
    test_files['pdf'] = pdf_path
    
    # DOCX file (ZIP signature)
    docx_content = b'PK\x03\x04\x14\x00\x06\x00\x08\x00\x21\x00' + b'\x00' * 50
    docx_path = os.path.join(temp_dir, 'sample.docx')
    with open(docx_path, 'wb') as f:
        f.write(docx_content)
    test_files['docx'] = docx_path
    
    # Text file
    txt_content = b'This is a sample text file.\nIt has multiple lines.\nUsed for testing file validation.'
    txt_path = os.path.join(temp_dir, 'sample.txt')
    with open(txt_path, 'wb') as f:
        f.write(txt_content)
    test_files['txt'] = txt_path
    
    # Markdown file
    md_content = b'# Test Markdown File\n\nThis is a **sample** markdown file for testing.\n\n## Features\n\n- File validation\n- Type detection\n- Content validation\n\n> This is used for testing purposes.'
    md_path = os.path.join(temp_dir, 'sample.md')
    with open(md_path, 'wb') as f:
        f.write(md_content)
    test_files['md'] = md_path
    
    return test_files

def main():
    """Main test function"""
    print("🚀 File Validation Utility Tests")
    print("=" * 50)
    
    # Test 1: Basic functionality
    if not test_basic_functionality():
        return False
    
    # Test 2: Real files
    if not test_with_real_files():
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All tests completed successfully!")
    print("\nTo run Django-specific tests, use:")
    print("  python manage.py test_file_validation")
    print("  python manage.py test_file_validation --quick")
    
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
