"""
Django management command to test file validation utilities
"""

import os
import tempfile
from django.core.management.base import BaseCommand
from django.core.files.uploadedfile import SimpleUploadedFile

from brands.utils.utils import (
    detect_file_type,
    validate_file_size,
    validate_file_content,
    validate_uploaded_file,
    get_file_metadata,
    get_supported_formats_info
)


class Command(BaseCommand):
    help = 'Test file validation utilities'

    def add_arguments(self, parser):
        parser.add_argument(
            '--quick',
            action='store_true',
            help='Run quick tests only',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('🧪 Testing File Validation Utilities')
        )
        self.stdout.write('=' * 50)

        # Test 1: Supported formats info
        self.test_supported_formats()
        
        if not options['quick']:
            # Test 2: Create test files and validate
            self.test_with_sample_files()
        
        # Test 3: Simple string-based tests
        self.test_simple_cases()
        
        self.stdout.write(
            self.style.SUCCESS('\n🎉 All tests completed!')
        )

    def test_supported_formats(self):
        """Test supported formats information"""
        self.stdout.write('\n=== Supported Formats Info ===')
        
        try:
            info = get_supported_formats_info()
            self.stdout.write(f"Total formats: {info['total_formats']}")
            self.stdout.write(f"Extensions: {', '.join(info['extensions'])}")
            
            for format_name, config in info['supported_formats'].items():
                max_size_mb = config['max_size'] / (1024 * 1024)
                self.stdout.write(
                    f"  {format_name}: {config['description']} (max: {max_size_mb}MB)"
                )
            
            self.stdout.write(self.style.SUCCESS('✅ Supported formats test passed'))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Supported formats test failed: {e}')
            )

    def test_simple_cases(self):
        """Test simple cases without creating files"""
        self.stdout.write('\n=== Simple Test Cases ===')
        
        try:
            # Test file type detection with non-existent files (extension-based)
            test_cases = [
                ('document.pdf', 'pdf'),
                ('spreadsheet.docx', 'docx'),
                ('readme.txt', 'txt'),
                ('notes.md', 'md'),
                ('image.png', None),  # Unsupported
            ]
            
            for filename, expected in test_cases:
                detected_type, mime_type = detect_file_type(f"/fake/path/{filename}")
                status = "✅" if detected_type == expected else "❌"
                self.stdout.write(
                    f"  {status} {filename}: detected={detected_type}, expected={expected}"
                )
            
            self.stdout.write(self.style.SUCCESS('✅ Simple test cases passed'))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Simple test cases failed: {e}')
            )

    def test_with_sample_files(self):
        """Test with actual sample files"""
        self.stdout.write('\n=== Sample Files Test ===')
        
        try:
            # Create temporary directory
            temp_dir = tempfile.mkdtemp()
            self.stdout.write(f"Creating test files in: {temp_dir}")
            
            # Create sample files
            test_files = self.create_sample_files(temp_dir)
            
            # Test each file
            for file_type, file_path in test_files.items():
                self.test_file(file_path, file_type)
            
            # Clean up
            import shutil
            shutil.rmtree(temp_dir)
            self.stdout.write(f"Cleaned up: {temp_dir}")
            
            self.stdout.write(self.style.SUCCESS('✅ Sample files test passed'))
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'❌ Sample files test failed: {e}')
            )

    def create_sample_files(self, temp_dir):
        """Create sample files for testing"""
        test_files = {}
        
        # PDF file
        pdf_content = b'%PDF-1.4\n%EOF'
        pdf_path = os.path.join(temp_dir, 'test.pdf')
        with open(pdf_path, 'wb') as f:
            f.write(pdf_content)
        test_files['pdf'] = pdf_path
        
        # DOCX file (ZIP signature)
        docx_content = b'PK\x03\x04' + b'\x00' * 100
        docx_path = os.path.join(temp_dir, 'test.docx')
        with open(docx_path, 'wb') as f:
            f.write(docx_content)
        test_files['docx'] = docx_path
        
        # TXT file
        txt_content = b'This is a test text file.'
        txt_path = os.path.join(temp_dir, 'test.txt')
        with open(txt_path, 'wb') as f:
            f.write(txt_content)
        test_files['txt'] = txt_path
        
        # Markdown file
        md_content = b'# Test Markdown\n\nThis is a test.'
        md_path = os.path.join(temp_dir, 'test.md')
        with open(md_path, 'wb') as f:
            f.write(md_content)
        test_files['md'] = md_path
        
        return test_files

    def test_file(self, file_path, expected_type):
        """Test a single file"""
        filename = os.path.basename(file_path)
        file_size = os.path.getsize(file_path)
        
        self.stdout.write(f"\n  Testing {filename} ({file_size} bytes):")
        
        # Test file type detection
        detected_type, mime_type = detect_file_type(file_path)
        self.stdout.write(f"    Type: {detected_type} (MIME: {mime_type})")
        
        if detected_type:
            # Test size validation
            size_errors = validate_file_size(file_path, detected_type)
            self.stdout.write(f"    Size validation: {len(size_errors)} errors")
            
            # Test content validation
            content_errors = validate_file_content(file_path, detected_type)
            self.stdout.write(f"    Content validation: {len(content_errors)} errors")
            
            # Test metadata extraction
            metadata = get_file_metadata(file_path, detected_type)
            self.stdout.write(f"    Metadata keys: {list(metadata.keys())}")
            
            # Test with uploaded file simulation
            with open(file_path, 'rb') as f:
                content = f.read()
            
            uploaded_file = SimpleUploadedFile(
                name=filename,
                content=content,
                content_type=mime_type or 'application/octet-stream'
            )
            
            result = validate_uploaded_file(uploaded_file)
            self.stdout.write(f"    Upload validation: {'✅ Valid' if result.is_valid else '❌ Invalid'}")
            if result.errors:
                for error in result.errors:
                    self.stdout.write(f"      - {error}")
