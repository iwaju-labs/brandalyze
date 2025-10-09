from setuptools import setup, find_packages

setup(
    name="ai-core",
    version="0.1.0",
    description="AI core functionality for Brandalyze",
    packages=find_packages(where="."),
    package_dir={"": "."},
    py_modules=[],
    install_requires=[
        "openai",
        "qdrant-client", 
        "numpy",
    ],
    python_requires=">=3.8",
    author="Brandalyze Team",
    author_email="dev@brandalyze.com",
    classifiers=[
        "Development Status :: 3 - Alpha",
        "Intended Audience :: Developers",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
)
