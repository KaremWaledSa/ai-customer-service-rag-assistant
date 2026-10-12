class User {
  final int id;
  final String email;
  final String? name;
  final String? phone;
  final String role;
  final DateTime createdAt;

  User({
    required this.id,
    required this.email,
    this.name,
    this.phone,
    required this.role,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id'],
      email: json['email'],
      name: json['name'],
      phone: json['phone'],
      role: json['role'] ?? 'doctor',
      createdAt: DateTime.parse(json['created_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'email': email,
      'name': name,
      'phone': phone,
      'role': role,
      'created_at': createdAt.toIso8601String(),
    };
  }

  String get displayName => name ?? email.split('@').first;

  String get initials {
    if (name != null && name!.isNotEmpty) {
      return name![0].toUpperCase();
    }
    return email[0].toUpperCase();
  }
}
